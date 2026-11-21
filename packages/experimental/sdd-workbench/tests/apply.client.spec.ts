/**
 * The plugin's registrations, and their removal when the plugin goes.
 *
 * The tab registry is real; the slot, locale, and Remote faces are recorders,
 * because what matters is what was handed to them and that every registration
 * is gone after dispose, which is what makes a reload safe.
 */
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { WORKBENCH_ID, WORKBENCH_KIND } from '../src/client/definition.ts'
import type { WorkbenchInjected } from '../src/client/face.ts'
import { apply, inject } from '../src/client/index.ts'
import { de, en, es, fr, ja, pt, ru, zh } from '../src/client/locales.ts'
import { WorkbenchBody } from '../src/client/WorkbenchBody.tsx'
import { apply as hostApply } from '../src/index.ts'

interface Recorded {
  readonly name: string
  readonly key: string
  readonly locale: string
  readonly inject: ((sessionId: SessionId) => WorkbenchInjected) | undefined
  readonly component: unknown
}

const SESSION = 'workbench-session' as SessionId

async function boot() {
  const ctx = new Context()
  const tabs = new SidebarRightTabRegistry(ctx)
  const registered: Recorded[] = []
  const slots = {
    inject: vi.fn((_name: string, register: () => () => void) => register()),
    register: vi.fn((options: Omit<Recorded, 'component'>, component: unknown) => {
      const entry: Recorded = { ...options, component }
      registered.push(entry)
      return () => { registered.splice(registered.indexOf(entry), 1) }
    }),
  }
  const dictionaries = new Map<string, unknown>()
  const locale = {
    // The key stands in for the translation.
    bind: vi.fn(() => (key: string) => key),
    register: vi.fn((ns: string, dicts: unknown) => {
      dictionaries.set(ns, dicts)
      return () => { dictionaries.delete(ns) }
    }),
  }
  const workspaceFiles = {
    read: vi.fn(async () => ({ ok: true, value: { text: '# ROADMAP', lines: 1, eof: true } })),
    list: vi.fn(async () => ({ ok: true, value: { entries: [{ name: 'BRIEF.md', type: 'file' }], truncated: false } })),
  }
  ctx.provide('sidebarRightTabs', tabs as never)
  ctx.provide('slots', slots as never)
  ctx.provide('locale', locale as never)
  ctx.provide('remote', { workspaceFiles } as never)
  ctx.provide('remote.workspaceFiles', workspaceFiles as never)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { tabs, registered, dictionaries, fiber, workspaceFiles }
}

describe('sdd-workbench apply', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('registers the page type with its guide card, the dictionaries, and the body under the type\'s id', async () => {
    const { tabs, registered, dictionaries, fiber } = await boot()
    onTestFinished(() => fiber.dispose())
    const definition = tabs.get(WORKBENCH_KIND)
    expect(definition?.id).toBe(WORKBENCH_ID)
    expect(definition?.keepMounted).toBe(true)
    expect(definition?.title('sidebar://sdd-workbench')).toBe('title')
    expect(definition?.guide?.map(entry => [entry.id, entry.title(), entry.description?.()]))
      .toEqual([['workbench', 'title', 'guide.description']])
    expect(dictionaries.get('sddWorkbench')).toEqual({ zh, en, ja, es, fr, de, ru, pt })
    expect(registered.map(entry => [entry.name, entry.key, entry.locale, entry.component]))
      .toEqual([['sidebar.right.pane.tab', WORKBENCH_ID, 'sddWorkbench', WorkbenchBody]])
  })

  it('hands the body only the two reads, bound to its Session', async () => {
    const { registered, fiber, workspaceFiles } = await boot()
    onTestFinished(() => fiber.dispose())
    const face = registered[0]!.inject!(SESSION)
    expect(Object.keys(face).sort()).toEqual(['listDirectory', 'readRoadmap'])
    const signal = new AbortController().signal
    await face.readRoadmap(signal)
    await face.listDirectory('mai-specs/999-x', signal)
    expect(workspaceFiles.read).toHaveBeenCalledWith(SESSION, 'mai-specs/ROADMAP.md', { offset: 1 }, signal)
    expect(workspaceFiles.list).toHaveBeenCalledWith(SESSION, 'mai-specs/999-x', signal)
  })

  it('takes every registration back when the plugin is disposed', async () => {
    const { tabs, registered, dictionaries, fiber } = await boot()
    expect(registered).toHaveLength(1)
    await fiber.dispose()
    expect(tabs.get(WORKBENCH_KIND)).toBeUndefined()
    expect(registered).toEqual([])
    expect(dictionaries.size).toBe(0)
  })
})
