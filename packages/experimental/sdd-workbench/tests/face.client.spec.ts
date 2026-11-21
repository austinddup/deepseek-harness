import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  MAX_ROADMAP_BYTES, MAX_ROADMAP_LINES, ROADMAP_PATH, ROADMAP_TOO_LARGE, workbenchFace, type WorkspaceFilesReadRemote,
} from '../src/client/face.ts'

const SESSION = 's-1' as SessionId
const signal = new AbortController().signal
const failure = (code: string, message: string) => ({ ok: false as const, error: { code, message } })
const page = (text: string, lines: number, eof: boolean, bytes?: number) => ({ ok: true as const, value: { text, lines, eof, bytes } })
const sized = (bytes?: number) => ({ ok: true as const, value: { bytes } })
const TOO_LARGE = { ok: false, code: ROADMAP_TOO_LARGE, message: '' }

function remoteOf(
  read: (...args: unknown[]) => unknown,
  list: (...args: unknown[]) => unknown = vi.fn(),
  stat: (...args: unknown[]) => unknown = vi.fn(async () => sized(10)),
) {
  return { workspaceFiles: { stat, read, list } } as unknown as WorkspaceFilesReadRemote
}

/** `count` pages of `size` lines each; the last one reaches the end of the file. */
function pages(count: number, size: number) {
  const read = vi.fn()
  for (let i = 1; i <= count; i++) read.mockResolvedValueOnce(page(`p${i}`, size, i === count))
  return read
}

describe('readRoadmap', () => {
  it('checks the size, then follows the pages to the last line and joins them', async () => {
    const stat = vi.fn(async () => sized(10))
    const read = vi.fn()
      .mockResolvedValueOnce(page('a\nb', 2, false))
      .mockResolvedValueOnce(page('c', 1, true))
    expect(await workbenchFace(remoteOf(read, vi.fn(), stat), SESSION).readRoadmap(signal)).toEqual({ ok: true, text: 'a\nb\nc' })
    expect(stat.mock.calls).toEqual([[SESSION, ROADMAP_PATH, signal]])
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

  it('reads a file whose size the Host does not report', async () => {
    const read = vi.fn().mockResolvedValueOnce(page('a', 1, true))
    const face = workbenchFace(remoteOf(read, vi.fn(), vi.fn(async () => sized())), SESSION)
    expect(await face.readRoadmap(signal)).toEqual({ ok: true, text: 'a' })
  })

  it('passes a Host failure of the size check or of a page on as a value, without reading on', async () => {
    const read = vi.fn().mockResolvedValueOnce(failure('workspace-file/not-text', 'binary'))
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal))
      .toEqual({ ok: false, code: 'workspace-file/not-text', message: 'binary' })
    const unread = vi.fn()
    const missing = vi.fn(async () => failure('workspace-file/not-found', 'missing'))
    expect(await workbenchFace(remoteOf(unread, vi.fn(), missing), SESSION).readRoadmap(signal))
      .toEqual({ ok: false, code: 'workspace-file/not-found', message: 'missing' })
    expect(unread).not.toHaveBeenCalled()
  })

  it('reads exactly the line limit', async () => {
    const read = pages(4, MAX_ROADMAP_LINES / 4)
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal)).toEqual({ ok: true, text: 'p1\np2\np3\np4' })
  })

  it('refuses a ROADMAP past the line limit and asks for no page after the one that passed it', async () => {
    // AC-10 (a): 20001 lines over five pages; the fifth page passes the limit.
    const read = vi.fn()
    for (let i = 1; i <= 4; i++) read.mockResolvedValueOnce(page(`p${i}`, MAX_ROADMAP_LINES / 4, false))
    read.mockResolvedValueOnce(page('last', 1, true))
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal)).toEqual(TOO_LARGE)
    expect(read).toHaveBeenCalledTimes(5)
    const more = vi.fn()
    for (let i = 1; i <= 5; i++) more.mockResolvedValueOnce(page(`p${i}`, MAX_ROADMAP_LINES / 4, false))
    more.mockResolvedValue(page('never', 1, true))
    expect(await workbenchFace(remoteOf(more), SESSION).readRoadmap(signal)).toEqual(TOO_LARGE)
    expect(more).toHaveBeenCalledTimes(5)
  })

  it('refuses a ROADMAP the Host reports past the byte limit without reading it', async () => {
    // AC-10 (b).
    const read = vi.fn()
    const face = workbenchFace(remoteOf(read, vi.fn(), vi.fn(async () => sized(MAX_ROADMAP_BYTES + 1))), SESSION)
    expect(await face.readRoadmap(signal)).toEqual(TOO_LARGE)
    expect(read).not.toHaveBeenCalled()
    const atLimit = vi.fn().mockResolvedValueOnce(page('a', 1, true, MAX_ROADMAP_BYTES))
    expect(await workbenchFace(remoteOf(atLimit, vi.fn(), vi.fn(async () => sized(MAX_ROADMAP_BYTES))), SESSION).readRoadmap(signal))
      .toEqual({ ok: true, text: 'a' })
  })

  it('refuses a ROADMAP that grew past the byte limit while its pages were read', async () => {
    const read = vi.fn()
      .mockResolvedValueOnce(page('a', 1, false, 10))
      .mockResolvedValueOnce(page('b', 1, false, MAX_ROADMAP_BYTES + 1))
    expect(await workbenchFace(remoteOf(read), SESSION).readRoadmap(signal)).toEqual(TOO_LARGE)
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('treats a page the Host refuses as too large as an oversized ROADMAP', async () => {
    const read = vi.fn().mockResolvedValueOnce(failure('workspace-file/too-large', 'lines 1-5000 exceed the byte cap'))
    expect(await workbenchFace(remoteOf(read, vi.fn(), vi.fn(async () => sized())), SESSION).readRoadmap(signal)).toEqual(TOO_LARGE)
  })
})

describe('listDirectory', () => {
  it('returns the entries with the Host cut, or the Host failure', async () => {
    const entries = [{ name: 'BRIEF.md', type: 'file' }]
    const list = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: { entries, truncated: false } })
      .mockResolvedValueOnce({ ok: true, value: { entries, truncated: true } })
      .mockResolvedValueOnce(failure('workspace-file/outside-workspace', 'outside'))
    const face = workbenchFace(remoteOf(vi.fn(), list), SESSION)
    expect(await face.listDirectory('mai-specs/x', signal)).toEqual({ ok: true, entries, truncated: false })
    expect(await face.listDirectory('mai-specs/z', signal)).toEqual({ ok: true, entries, truncated: true })
    expect(await face.listDirectory('mai-specs/y', signal)).toEqual({ ok: false, code: 'workspace-file/outside-workspace', message: 'outside' })
    expect(list.mock.calls).toEqual([[SESSION, 'mai-specs/x', signal], [SESSION, 'mai-specs/z', signal], [SESSION, 'mai-specs/y', signal]])
  })
})
