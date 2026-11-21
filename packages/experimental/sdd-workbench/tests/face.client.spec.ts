import { describe, expect, it, vi } from 'vitest'
import { RemoteError } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  MAX_ROADMAP_BYTES, MAX_ROADMAP_LINES, ROADMAP_PATH, ROADMAP_TOO_LARGE, workbenchFace, type WorkspaceFilesReadRemote,
} from '../src/client/face.ts'

const SESSION = 's-1' as SessionId
const signal = new AbortController().signal
const ABSOLUTE = '/work/repo/mai-specs/ROADMAP.md'
const TOO_LARGE = { ok: false, code: ROADMAP_TOO_LARGE, message: '' }

type Files = WorkspaceFilesReadRemote['workspaceFiles']
type Read = Files['read']
type Stat = Files['stat']
type List = Files['list']

/** The file's identity, with its size only when the Host reports one. */
const identity = (bytes?: number) => ({ absolutePath: ABSOLUTE, version: 'v1', ...bytes === undefined ? {} : { bytes } })
const page = (text: string, lines: number, eof: boolean, bytes?: number) =>
  ({ ok: true as const, value: { ...identity(bytes), offset: 1, text, lines, eof } })
const sized = (bytes?: number) => ({ ok: true as const, value: identity(bytes) })
const statOf = (bytes?: number) => vi.fn<Stat>(async () => sized(bytes))

function remoteOf(read: Read, list: List = vi.fn<List>(), stat: Stat = statOf(10)): WorkspaceFilesReadRemote {
  return { workspaceFiles: { stat, read, list } }
}

/** A read answering `count` pages of `size` lines each, none of them the last. */
function openPages(count: number, size: number) {
  const read = vi.fn<Read>()
  for (let i = 1; i <= count; i++) read.mockResolvedValueOnce(page(`p${i}`, size, false))
  return read
}

describe('readRoadmap', () => {
  it('checks the size, then follows the pages to the last line and joins them', async () => {
    const stat = statOf(10)
    const read = vi.fn<Read>()
      .mockResolvedValueOnce(page('a\nb', 2, false))
      .mockResolvedValueOnce(page('c', 1, true))
    expect(await workbenchFace(remoteOf(read, vi.fn<List>(), stat), SESSION).readRoadmap(signal)).toEqual({ ok: true, text: 'a\nb\nc' })
    expect(stat.mock.calls).toEqual([[SESSION, ROADMAP_PATH, signal]])
    expect(read.mock.calls).toEqual([[SESSION, ROADMAP_PATH, { offset: 1 }, signal], [SESSION, ROADMAP_PATH, { offset: 3 }, signal]])
  })

  it('stops at a page past the last line', async () => {
    const read = vi.fn<Read>()
      .mockResolvedValueOnce(page('a', 1, false))
      .mockResolvedValueOnce(page('', 0, false))
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal)).toEqual({ ok: true, text: 'a' })
  })

  it('reads an empty file as empty text', async () => {
    const read = vi.fn<Read>().mockResolvedValueOnce(page('', 0, true))
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal)).toEqual({ ok: true, text: '' })
  })

  it('reads a file whose size the Host does not report', async () => {
    const read = vi.fn<Read>().mockResolvedValueOnce(page('a', 1, true))
    expect(await workbenchFace(remoteOf(read, vi.fn<List>(), statOf()), SESSION).readRoadmap(signal)).toEqual({ ok: true, text: 'a' })
  })

  it('passes a Host failure of the size check or of a page on as a value, without reading on', async () => {
    const read = vi.fn<Read>().mockResolvedValueOnce({ ok: false, error: new RemoteError('workspace-file/not-text', 'binary', { path: ABSOLUTE }) })
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal))
      .toEqual({ ok: false, code: 'workspace-file/not-text', message: 'binary' })
    const unread = vi.fn<Read>()
    const missing = vi.fn<Stat>(async () => ({ ok: false, error: new RemoteError('workspace-file/not-found', 'missing', { path: ABSOLUTE }) }))
    expect(await workbenchFace(remoteOf(unread, vi.fn<List>(), missing), SESSION).readRoadmap(signal))
      .toEqual({ ok: false, code: 'workspace-file/not-found', message: 'missing' })
    expect(unread).not.toHaveBeenCalled()
  })

  it('reads exactly the line limit', async () => {
    const read = openPages(3, MAX_ROADMAP_LINES / 4).mockResolvedValueOnce(page('p4', MAX_ROADMAP_LINES / 4, true))
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal)).toEqual({ ok: true, text: 'p1\np2\np3\np4' })
  })

  it('refuses a ROADMAP past the line limit and asks for no page after the one that passed it', async () => {
    // AC-10 (a): 20001 lines over five pages; the fifth page passes the limit.
    const read = openPages(4, MAX_ROADMAP_LINES / 4).mockResolvedValueOnce(page('last', 1, true))
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal)).toEqual(TOO_LARGE)
    expect(read).toHaveBeenCalledTimes(5)
    const more = openPages(5, MAX_ROADMAP_LINES / 4).mockResolvedValue(page('never', 1, true))
    expect(await workbenchFace(remoteOf(more), SESSION).readRoadmap(signal)).toEqual(TOO_LARGE)
    expect(more).toHaveBeenCalledTimes(5)
  })

  it('refuses a ROADMAP the Host reports past the byte limit without reading it', async () => {
    // AC-10 (b).
    const read = vi.fn<Read>()
    const face = workbenchFace(remoteOf(read, vi.fn<List>(), statOf(MAX_ROADMAP_BYTES + 1)), SESSION)
    expect(await face.readRoadmap(signal)).toEqual(TOO_LARGE)
    expect(read).not.toHaveBeenCalled()
    const atLimit = vi.fn<Read>().mockResolvedValueOnce(page('a', 1, true, MAX_ROADMAP_BYTES))
    expect(await workbenchFace(remoteOf(atLimit, vi.fn<List>(), statOf(MAX_ROADMAP_BYTES)), SESSION).readRoadmap(signal))
      .toEqual({ ok: true, text: 'a' })
  })

  it('refuses a ROADMAP that grew past the byte limit while its pages were read', async () => {
    const read = vi.fn<Read>()
      .mockResolvedValueOnce(page('a', 1, false, 10))
      .mockResolvedValueOnce(page('b', 1, false, MAX_ROADMAP_BYTES + 1))
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal)).toEqual(TOO_LARGE)
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('treats a page the Host refuses as too large as an oversized ROADMAP', async () => {
    const error = new RemoteError('workspace-file/too-large', 'lines 1-5000 exceed the byte cap', { path: ABSOLUTE, limit: MAX_ROADMAP_BYTES })
    const read = vi.fn<Read>().mockResolvedValueOnce({ ok: false, error })
    expect(await workbenchFace(remoteOf(read, vi.fn<List>(), statOf()), SESSION).readRoadmap(signal)).toEqual(TOO_LARGE)
  })
})

describe('listDirectory', () => {
  it('returns the entries with the Host cut, or the Host failure', async () => {
    const entries = [{ name: 'BRIEF.md', type: 'file' as const }]
    const list = vi.fn<List>()
      .mockResolvedValueOnce({ ok: true, value: { path: 'mai-specs/x', entries, truncated: false } })
      .mockResolvedValueOnce({ ok: true, value: { path: 'mai-specs/z', entries, truncated: true } })
      .mockResolvedValueOnce({ ok: false, error: new RemoteError('workspace-file/outside-workspace', 'outside', { path: 'mai-specs/y' }) })
    const face = workbenchFace(remoteOf(vi.fn<Read>(), list), SESSION)
    expect(await face.listDirectory('mai-specs/x', signal)).toEqual({ ok: true, entries, truncated: false })
    expect(await face.listDirectory('mai-specs/z', signal)).toEqual({ ok: true, entries, truncated: true })
    expect(await face.listDirectory('mai-specs/y', signal)).toEqual({ ok: false, code: 'workspace-file/outside-workspace', message: 'outside' })
    expect(list.mock.calls).toEqual([[SESSION, 'mai-specs/x', signal], [SESSION, 'mai-specs/z', signal], [SESSION, 'mai-specs/y', signal]])
  })
})
