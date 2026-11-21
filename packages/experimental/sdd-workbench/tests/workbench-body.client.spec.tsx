// @vitest-environment jsdom
/** The workbench page over scripted reads: its states, the tree, opening files, refresh, and the filter. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { fileAddressFor } from '@deepseek-ai/dsh-util-workspace-path'
import type { ListDirectory, ListResult } from '../src/client/feature-files.ts'
import type { ReadRoadmap, RoadmapText } from '../src/client/face.ts'
import { zh } from '../src/client/locales.ts'
import { WorkbenchBody, type WorkbenchBodyProps } from '../src/client/WorkbenchBody.tsx'

const SESSION = 's-workbench' as SessionId
const ROOT = '/work/repo'
const PANE = 'pane-1'
const t = makeTranslate(zh)

const HEAD = '| 需求 | 标题 | 规格 | 优先级 | 说明 |\n|---|---|---|---|---|'
const row = (id: string, title: string, link: string, priority = 'P1') => `| ${id} | [${title}](${link}) | standard | ${priority} | |`
const roadmap = (inProgress: readonly string[], planned: readonly string[] = [], done: readonly string[] = []) =>
  ['## 进行中', HEAD, ...inProgress, '', '## 规划中', HEAD, ...planned, '', '## 已完成', HEAD, ...done].join('\n')

const R999 = row('999', 'SDD 工作台：Feature 导航与规格查看', '999-sdd-workbench/BRIEF.md')
const DIR999 = 'mai-specs/999-sdd-workbench'

/** Directory contents by Workspace path: a string array lists files, an object maps subdirectories. */
type Tree = Readonly<Record<string, readonly (string | readonly [string, 'dir'])[]>>

const TREE: Tree = {
  [DIR999]: ['spec', 'BRIEF.md', 'review'].map(name => name === 'BRIEF.md' ? name : [name, 'dir'] as const),
  [`${DIR999}/spec`]: ['PRD.md'],
  [`${DIR999}/review`]: ['prd_review.md', 'design_review.md'],
}

function listOf(tree: Tree): ListDirectory {
  return async (path) => {
    const entries = tree[path]
    if (entries === undefined) return { ok: false, code: 'workspace-file/not-found', message: `no ${path}` }
    return {
      ok: true,
      entries: entries.map(entry => typeof entry === 'string' ? { name: entry, type: 'file' as const } : { name: entry[0], type: 'directory' as const }),
    }
  }
}

interface Options {
  readonly cwd?: string | null
  readonly read?: ReadRoadmap
  readonly list?: ListDirectory
  readonly floating?: boolean
}

function mount(options: Options = {}) {
  const read = vi.fn(options.read ?? (async (): Promise<RoadmapText> => ({ ok: true, text: roadmap([R999]) })))
  const list = vi.fn(options.list ?? listOf(TREE))
  const openResource = vi.fn()
  const placement = { cwd: options.cwd === undefined ? ROOT : options.cwd, floating: options.floating ?? false }
  const props = () => ({
    sessionId: SESSION,
    useSessions: <S,>(select: (state: unknown) => S) =>
      select({ byId: placement.cwd === null ? {} : { [SESSION]: { cwd: placement.cwd } } }),
    useTabInfo: () => ({
      panel: { id: PANE, isFloating: placement.floating },
      tab: { actions: { openResource } },
    }),
    readRoadmap: read,
    listDirectory: list,
    t,
  }) as unknown as WorkbenchBodyProps
  const view = render(<WorkbenchBody {...props()} />)
  const rerender = () => { view.rerender(<WorkbenchBody {...props()} />) }
  return { view, read, list, openResource, placement, rerender }
}

afterEach(() => { cleanup() })

const rows = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-workbench-row]')]
const texts = (root: HTMLElement) => rows(root).map(element => element.textContent)
const feature = (root: HTMLElement, id: string) => root.querySelector<HTMLElement>(`[data-workbench-feature="${id}"]`)!
const file = (root: HTMLElement, path: string) => root.querySelector<HTMLElement>(`[data-workbench-path="${path}"]`)!
const state = (root: HTMLElement) => root.querySelector('[data-workbench-state]')?.getAttribute('data-workbench-state')
const refresh = (root: HTMLElement) => root.querySelector<HTMLButtonElement>('[data-workbench-refresh]')!
const filter = (root: HTMLElement) => root.querySelector<HTMLInputElement>('[data-workbench-filter] input, input[data-workbench-filter]')!

/** A read that answers when the spec says so. */
function deferredReads() {
  const pending: ((answer: RoadmapText) => void)[] = []
  const read: ReadRoadmap = () => new Promise((resolve) => { pending.push(resolve) })
  return { read, answer: (index: number, value: RoadmapText) => act(async () => { pending[index]!(value) }) }
}

describe('page states (UI-01, AC-06)', () => {
  it('says the Session has no working directory and reads nothing', () => {
    const { view, read } = mount({ cwd: null })
    expect(view.container.textContent).toContain(zh['state.noWorkspace'])
    expect(state(view.container)).toBe('no-workspace')
    expect(refresh(view.container).disabled).toBe(true)
    expect(read).not.toHaveBeenCalled()
  })

  it('shows one spinner and a disabled refresh while the first read is under way', () => {
    const { view } = mount({ read: () => new Promise(() => {}) })
    expect(state(view.container)).toBe('loading')
    expect(view.container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(refresh(view.container).disabled).toBe(true)
  })

  it('asks to set up my-ai-infra when the ROADMAP is missing', async () => {
    const { view } = mount({ read: async () => ({ ok: false, code: 'workspace-file/not-found', message: 'gone' }) })
    await waitFor(() => { expect(state(view.container)).toBe('uninitialized') })
    expect(view.container.textContent).toContain(zh['state.uninitialized'])
    expect(refresh(view.container).disabled).toBe(false)
  })

  it('shows a failed first read with the Host reason, and retries on refresh', async () => {
    const reads = deferredReads()
    const { view } = mount({ read: reads.read })
    await reads.answer(0, { ok: false, code: 'workspace-file/not-text', message: 'binary' })
    expect(view.container.textContent).toContain('无法读取 ROADMAP：binary')
    fireEvent.click(refresh(view.container))
    expect(state(view.container)).toBe('loading')
    await reads.answer(1, { ok: true, text: roadmap([R999]) })
    expect(texts(view.container)[0]).toBe('进行中 (1)')
  })

  it('says the ROADMAP has no Features when every section is empty', async () => {
    const { view } = mount({ read: async () => ({ ok: true, text: roadmap([]) }) })
    await waitFor(() => { expect(state(view.container)).toBe('no-features') })
    expect(view.container.textContent).toContain(zh['state.noFeatures'])
    expect(filter(view.container)).toBeNull()
  })
})

describe('the tree (AC-02, AC-03, AC-04)', () => {
  it('groups the Features in fixed section order with counts, all sections open', async () => {
    const { view } = mount({ read: async () => ({ ok: true, text: roadmap([R999], [], [row('001', '旧需求', '001-old/BRIEF.md', '')]) }) })
    await waitFor(() => { expect(rows(view.container)).toHaveLength(5) })
    expect(texts(view.container)).toEqual(['进行中 (1)', '999SDD 工作台：Feature 导航与规格查看P1', '规划中 (0)', '已完成 (1)', '001旧需求'])
    expect(view.container.querySelector('[role="tree"]')?.getAttribute('aria-label')).toBe(zh.title)
    expect(feature(view.container, '999').getAttribute('aria-expanded')).toBe('false')
  })

  it('lists a Feature\'s files when expanded, BRIEF.md first, and collapses it again', async () => {
    const { view, list } = mount()
    await waitFor(() => { expect(feature(view.container, '999')).not.toBeNull() })
    fireEvent.click(feature(view.container, '999'))
    await waitFor(() => { expect(file(view.container, 'BRIEF.md')).not.toBeNull() })
    expect(rows(view.container).filter(element => element.dataset.workbenchRow === 'file').map(element => element.dataset.workbenchPath))
      .toEqual(['BRIEF.md', 'review/design_review.md', 'review/prd_review.md', 'spec/PRD.md'])
    expect(list.mock.calls.map(([path]) => path)).toEqual([DIR999, `${DIR999}/spec`, `${DIR999}/review`])
    fireEvent.click(feature(view.container, '999'))
    expect(file(view.container, 'BRIEF.md')).toBeNull()
    // The listing is kept: expanding again asks nothing.
    fireEvent.click(feature(view.container, '999'))
    expect(file(view.container, 'BRIEF.md')).not.toBeNull()
    expect(list).toHaveBeenCalledTimes(3)
  })

  it('shows a spinner line while a Feature is being listed', async () => {
    const { view } = mount({ list: () => new Promise(() => {}) })
    await waitFor(() => { expect(feature(view.container, '999')).not.toBeNull() })
    fireEvent.click(feature(view.container, '999'))
    const note = view.container.querySelector('[data-workbench-row="note"]')!
    expect(note.getAttribute('aria-busy')).toBe('true')
  })

  it('opens a file in the document preview of this pane, or wherever a floating tab opens it', async () => {
    const { view, openResource, placement, rerender } = mount()
    await waitFor(() => { expect(feature(view.container, '999')).not.toBeNull() })
    fireEvent.click(feature(view.container, '999'))
    await waitFor(() => { expect(file(view.container, 'spec/PRD.md')).not.toBeNull() })
    fireEvent.click(file(view.container, 'spec/PRD.md'))
    expect(openResource).toHaveBeenLastCalledWith(fileAddressFor(SESSION, ROOT, `${DIR999}/spec/PRD.md`), { paneId: PANE })
    placement.floating = true
    rerender()
    fireEvent.click(file(view.container, 'spec/PRD.md'))
    expect(openResource.mock.lastCall).toEqual([fileAddressFor(SESSION, ROOT, `${DIR999}/spec/PRD.md`)])
  })

  it.each<[string, ListResult | 'empty', string]>([
    ['missing', { ok: false, code: 'workspace-file/not-found', message: 'x' }, '未找到需求目录 999-sdd-workbench/BRIEF.md'],
    ['failed', { ok: false, code: 'workspace-file/permission-denied', message: 'denied' }, '无法读取需求目录：denied'],
    ['empty', 'empty', zh['feature.empty']],
  ])('says so when the Feature directory is %s', async (_name, answer, text) => {
    const { view } = mount({ list: async () => answer === 'empty' ? { ok: true, entries: [] } : answer })
    await waitFor(() => { expect(feature(view.container, '999')).not.toBeNull() })
    fireEvent.click(feature(view.container, '999'))
    await waitFor(() => { expect(view.container.querySelector('[data-workbench-row="note"]')?.textContent).toBe(text) })
  })

  it('never lists the directory of an out-of-bounds row (AC-07)', async () => {
    const text = roadmap([R999, row('TMP-A', '甲', '../../outside/BRIEF.md'), row('TMP-B', '乙', '../src/BRIEF.md')])
    const { view, list } = mount({ read: async () => ({ ok: true, text }) })
    await waitFor(() => { expect(feature(view.container, 'TMP-B')).not.toBeNull() })
    fireEvent.click(feature(view.container, 'TMP-A'))
    fireEvent.click(feature(view.container, 'TMP-B'))
    expect([...view.container.querySelectorAll('[data-workbench-row="note"]')].map(note => note.textContent))
      .toEqual(['未找到需求目录 ../../outside/BRIEF.md', '未找到需求目录 ../src/BRIEF.md'])
    // A query reads every listing it needs, still never these.
    fireEvent.change(filter(view.container), { target: { value: '甲' } })
    await waitFor(() => { expect(list).toHaveBeenCalled() })
    expect(list.mock.calls.every(([path]) => path.startsWith(DIR999))).toBe(true)
  })

  it('collapses and expands a section', async () => {
    const { view } = mount()
    await waitFor(() => { expect(feature(view.container, '999')).not.toBeNull() })
    const section = rows(view.container)[0]!
    fireEvent.click(section)
    expect(section.getAttribute('aria-expanded')).toBe('false')
    expect(feature(view.container, '999')).toBeNull()
    fireEvent.click(section)
    expect(feature(view.container, '999')).not.toBeNull()
  })

  it('names each Feature row in full and anchors a tooltip for a clipped title', async () => {
    const { view } = mount({ read: async () => ({ ok: true, text: roadmap([row('5', '无优先级', '5-x/BRIEF.md', '')]) }) })
    await waitFor(() => { expect(feature(view.container, '5')).not.toBeNull() })
    expect(feature(view.container, '5').getAttribute('aria-label')).toBe('5 无优先级')
  })
})

describe('refresh (AC-05)', () => {
  it('keeps expansion when a row is inserted before 999 and shows the new file', async () => {
    const reads = deferredReads()
    const tree: Record<string, readonly (string | readonly [string, 'dir'])[]> = { ...TREE }
    const { view, list } = mount({ read: reads.read, list: listOf(tree) })
    await reads.answer(0, { ok: true, text: roadmap([R999]) })
    fireEvent.click(feature(view.container, '999'))
    await waitFor(() => { expect(file(view.container, 'BRIEF.md')).not.toBeNull() })
    tree[DIR999] = [...TREE[DIR999]!, 'NEW.md']
    fireEvent.click(refresh(view.container))
    // The list stays while the refresh runs; the button waits for it.
    expect(feature(view.container, '999')).not.toBeNull()
    expect(refresh(view.container).disabled).toBe(true)
    await reads.answer(1, { ok: true, text: roadmap([row('998', '新需求', '998-new/BRIEF.md'), R999]) })
    await waitFor(() => { expect(file(view.container, 'NEW.md')).not.toBeNull() })
    expect(texts(view.container).slice(0, 3)).toEqual(['进行中 (2)', '998新需求P1', '999SDD 工作台：Feature 导航与规格查看P1'])
    expect(feature(view.container, '998').getAttribute('aria-expanded')).toBe('false')
    expect(feature(view.container, '999').getAttribute('aria-expanded')).toBe('true')
    expect(list.mock.calls.filter(([path]) => path === DIR999)).toHaveLength(2)
  })

  it('keeps the previous list and its listings after a failed refresh, and clears the notice on success', async () => {
    const reads = deferredReads()
    const { view, list } = mount({ read: reads.read })
    await reads.answer(0, { ok: true, text: roadmap([R999]) })
    fireEvent.click(feature(view.container, '999'))
    await waitFor(() => { expect(file(view.container, 'BRIEF.md')).not.toBeNull() })
    fireEvent.click(refresh(view.container))
    await reads.answer(1, { ok: false, code: 'workspace-file/not-found', message: 'gone' })
    expect(view.container.querySelector('[data-workbench-notice]')?.textContent).toBe('刷新失败：gone。显示的是上次的结果')
    expect(file(view.container, 'BRIEF.md')).not.toBeNull()
    expect(list).toHaveBeenCalledTimes(3)
    fireEvent.click(refresh(view.container))
    await reads.answer(2, { ok: true, text: roadmap([R999]) })
    expect(view.container.querySelector('[data-workbench-notice]')).toBeNull()
  })

  it('shows the notice above an empty ROADMAP state too', async () => {
    const reads = deferredReads()
    const { view } = mount({ read: reads.read })
    await reads.answer(0, { ok: true, text: roadmap([]) })
    fireEvent.click(refresh(view.container))
    await reads.answer(1, { ok: false, code: 'x', message: 'io' })
    expect(view.container.querySelector('[data-workbench-notice]')).not.toBeNull()
    expect(state(view.container)).toBe('no-features')
  })

  it('drops a listing that a refresh replaced', async () => {
    const reads = deferredReads()
    const listings: ((answer: ListResult) => void)[] = []
    const { view } = mount({
      read: reads.read,
      list: path => path === DIR999 && listings.length === 0
        ? new Promise((resolve) => { listings.push(resolve) })
        : listOf(TREE)(path, new AbortController().signal),
    })
    await reads.answer(0, { ok: true, text: roadmap([R999]) })
    fireEvent.click(feature(view.container, '999'))
    fireEvent.click(refresh(view.container))
    // A second press while the refresh runs does nothing.
    fireEvent.click(refresh(view.container))
    await act(async () => { listings[0]!({ ok: true, entries: [{ name: 'STALE.md', type: 'file' }] }) })
    expect(file(view.container, 'STALE.md')).toBeNull()
    await reads.answer(1, { ok: true, text: roadmap([R999]) })
    await waitFor(() => { expect(file(view.container, 'BRIEF.md')).not.toBeNull() })
    expect(file(view.container, 'STALE.md')).toBeNull()
  })

  it('reads again from scratch when the working directory changes, dropping the old read, and stops reading on unmount', async () => {
    const reads = deferredReads()
    const { view, placement, rerender } = mount({ read: reads.read })
    await reads.answer(0, { ok: true, text: roadmap([R999]) })
    fireEvent.click(refresh(view.container))
    placement.cwd = '/work/other'
    rerender()
    expect(state(view.container)).toBe('loading')
    // The refresh started in the old directory answers late; its list must not show.
    await reads.answer(1, { ok: true, text: roadmap([row('1', 'stale', '1-x/BRIEF.md')]) })
    expect(feature(view.container, '1')).toBeNull()
    await reads.answer(2, { ok: false, code: 'workspace-file/permission-denied', message: 'denied' })
    // A failure in the new directory never falls back to the old directory's list.
    expect(view.container.textContent).toContain('无法读取 ROADMAP：denied')
    fireEvent.click(refresh(view.container))
    view.unmount()
    await reads.answer(3, { ok: true, text: roadmap([R999]) })
  })
})

describe('filter (AC-09, BR-06)', () => {
  const twoFeatures = roadmap([R999], [row('998', 'Bench tools', '998-bench/BRIEF.md')])
  const tree: Tree = { ...TREE, 'mai-specs/998-bench': ['BRIEF.md'] }

  it('opens a Feature matched only through files and lists just those, and restores the full list on clear', async () => {
    const { view } = mount({ read: async () => ({ ok: true, text: twoFeatures }), list: listOf(tree) })
    await waitFor(() => { expect(feature(view.container, '998')).not.toBeNull() })
    fireEvent.click(feature(view.container, '998'))
    fireEvent.change(filter(view.container), { target: { value: 'prd' } })
    await waitFor(() => { expect(file(view.container, 'spec/PRD.md')).not.toBeNull() })
    expect(texts(view.container)).toEqual(['进行中 (1)', '999SDD 工作台：Feature 导航与规格查看P1', 'review/prd_review.md', 'spec/PRD.md'])
    // Collapsing under the query changes only the filtered view.
    fireEvent.click(feature(view.container, '999'))
    expect(file(view.container, 'spec/PRD.md')).toBeNull()
    fireEvent.keyDown(filter(view.container), { key: 'Escape' })
    expect(filter(view.container).value).toBe('')
    expect(feature(view.container, '999').getAttribute('aria-expanded')).toBe('false')
    expect(feature(view.container, '998').getAttribute('aria-expanded')).toBe('true')
  })

  it('keeps the user\'s expansion for an id or title match, and Escape on an empty box does nothing', async () => {
    const { view } = mount({ read: async () => ({ ok: true, text: twoFeatures }), list: listOf(tree) })
    await waitFor(() => { expect(feature(view.container, '998')).not.toBeNull() })
    fireEvent.change(filter(view.container), { target: { value: '999' } })
    await waitFor(() => { expect(texts(view.container)).toEqual(['进行中 (1)', '999SDD 工作台：Feature 导航与规格查看P1']) })
    fireEvent.click(feature(view.container, '999'))
    await waitFor(() => { expect(file(view.container, 'review/design_review.md')).not.toBeNull() })
    fireEvent.change(filter(view.container), { target: { value: '' } })
    expect(file(view.container, 'BRIEF.md')).toBeNull()
    const escape = fireEvent.keyDown(filter(view.container), { key: 'Escape' })
    expect(escape).toBe(true)
    fireEvent.keyDown(filter(view.container), { key: 'a' })
  })

  it('waits for the listings before saying nothing matches', async () => {
    const pending: ((answer: ListResult) => void)[] = []
    const { view } = mount({ list: () => new Promise((resolve) => { pending.push(resolve) }) })
    await waitFor(() => { expect(feature(view.container, '999')).not.toBeNull() })
    fireEvent.change(filter(view.container), { target: { value: '不存在的词' } })
    expect(state(view.container)).toBe('filtering')
    await act(async () => { pending[0]!({ ok: true, entries: [] }) })
    expect(state(view.container)).toBe('no-match')
    expect(view.container.textContent).toContain(zh['filter.noMatch'])
  })
})

describe('keyboard (UI-01 accessibility)', () => {
  it('moves one tab stop with the arrows, toggles with Enter, Space, and the side arrows, and opens a file with Enter', async () => {
    const { view, openResource } = mount()
    await waitFor(() => { expect(feature(view.container, '999')).not.toBeNull() })
    const [section] = rows(view.container)
    expect(rows(view.container).map(element => element.tabIndex)).toEqual([0, -1, -1, -1])
    fireEvent.keyDown(section!, { key: 'ArrowUp' })
    fireEvent.keyDown(section!, { key: 'ArrowDown' })
    const row999 = feature(view.container, '999')
    expect(document.activeElement).toBe(row999)
    expect(row999.tabIndex).toBe(0)
    fireEvent.keyDown(row999, { key: 'ArrowRight' })
    await waitFor(() => { expect(file(view.container, 'BRIEF.md')).not.toBeNull() })
    fireEvent.keyDown(row999, { key: 'ArrowRight' })
    fireEvent.keyDown(row999, { key: 'ArrowDown' })
    const brief = file(view.container, 'BRIEF.md')
    expect(document.activeElement).toBe(brief)
    fireEvent.keyDown(brief, { key: ' ' })
    fireEvent.keyDown(brief, { key: 'ArrowLeft' })
    fireEvent.keyDown(brief, { key: 'ArrowRight' })
    fireEvent.keyDown(brief, { key: 'Enter' })
    expect(openResource).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(row999, { key: 'ArrowLeft' })
    expect(file(view.container, 'BRIEF.md')).toBeNull()
    fireEvent.keyDown(row999, { key: 'ArrowLeft' })
    fireEvent.keyDown(row999, { key: 'Enter' })
    await waitFor(() => { expect(file(view.container, 'BRIEF.md')).not.toBeNull() })
    fireEvent.keyDown(row999, { key: ' ' })
    expect(file(view.container, 'BRIEF.md')).toBeNull()
    const tab = fireEvent.keyDown(row999, { key: 'Tab' })
    expect(tab).toBe(true)
    // The focused row keeps the tab stop; a row that goes hands it to the first.
    fireEvent.focus(row999)
    fireEvent.click(section!)
    expect(rows(view.container)[0]!.tabIndex).toBe(0)
  })
})
