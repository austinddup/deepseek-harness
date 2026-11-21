import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { ROADMAP_PATH, workbenchFace, type WorkspaceFilesReadRemote } from '../src/client/face.ts'

const SESSION = 's-1' as SessionId
const signal = new AbortController().signal
const failure = (code: string, message: string) => ({ ok: false as const, error: { code, message } })
const page = (text: string, lines: number, eof: boolean) => ({ ok: true as const, value: { text, lines, eof } })

function remoteOf(read: (...args: unknown[]) => unknown, list: (...args: unknown[]) => unknown = vi.fn()) {
  return { workspaceFiles: { read, list } } as unknown as WorkspaceFilesReadRemote
}

describe('readRoadmap', () => {
  it('follows the pages to the last line and joins them', async () => {
    const read = vi.fn()
      .mockResolvedValueOnce(page('a\nb', 2, false))
      .mockResolvedValueOnce(page('c', 1, true))
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal)).toEqual({ ok: true, text: 'a\nb\nc' })
    expect(read.mock.calls).toEqual([[SESSION, ROADMAP_PATH, { offset: 1 }, signal], [SESSION, ROADMAP_PATH, { offset: 3 }, signal]])
  })

  it('stops at a page past the last line', async () => {
    const read = vi.fn()
      .mockResolvedValueOnce(page('a', 1, false))
      .mockResolvedValueOnce(page('', 0, false))
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal)).toEqual({ ok: true, text: 'a' })
  })

  it('reads an empty file as empty text', async () => {
    const read = vi.fn().mockResolvedValueOnce(page('', 0, true))
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal)).toEqual({ ok: true, text: '' })
  })

  it('passes the Host failure on as a value', async () => {
    const read = vi.fn().mockResolvedValueOnce(failure('workspace-file/not-found', 'missing'))
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal))
      .toEqual({ ok: false, code: 'workspace-file/not-found', message: 'missing' })
  })
})

describe('listDirectory', () => {
  it('returns the entries or the Host failure', async () => {
    const entries = [{ name: 'BRIEF.md', type: 'file' }]
    const list = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: { entries, truncated: false } })
      .mockResolvedValueOnce(failure('workspace-file/outside-workspace', 'outside'))
    const face = workbenchFace(remoteOf(vi.fn(), list), SESSION)
    expect(await face.listDirectory('mai-specs/x', signal)).toEqual({ ok: true, entries })
    expect(await face.listDirectory('mai-specs/y', signal)).toEqual({ ok: false, code: 'workspace-file/outside-workspace', message: 'outside' })
    expect(list.mock.calls).toEqual([[SESSION, 'mai-specs/x', signal], [SESSION, 'mai-specs/y', signal]])
  })
})
