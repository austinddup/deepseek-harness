import { describe, expect, it } from 'vitest'
import { listFeatureFiles, MAX_DEPTH, MAX_ENTRIES, sortFiles, type ListDirectory, type ListResult } from '../src/client/feature-files.ts'

/** A directory tree: a string value is a file of that type, an object is a directory. */
interface Tree { readonly [name: string]: Tree | 'file' | 'other' }

const DIR = 'mai-specs/999-x'

/** `count` files named `f0000.md` upward. */
function manyFiles(count: number): Tree {
  return Object.fromEntries(Array.from({ length: count }, (_, i) => [`f${String(i).padStart(4, '0')}.md`, 'file' as const]))
}

/**
 * Serves `tree` as the contents of DIR, recording every path it is asked to list.
 * Paths in `cut` come back marked as truncated by the Host.
 */
function fakeList(
  tree: Tree,
  failures: Readonly<Record<string, ListResult>> = {},
  cut: ReadonlySet<string> = new Set(),
): { list: ListDirectory; calls: string[] } {
  const calls: string[] = []
  const list: ListDirectory = async (path) => {
    calls.push(path)
    const failure = failures[path]
    if (failure !== undefined) return failure
    let node: Tree | 'file' | 'other' | undefined = tree
    for (const part of path.slice(DIR.length).split('/').filter(Boolean)) node = typeof node === 'object' ? node[part] : undefined
    if (typeof node !== 'object') return { ok: false, code: 'workspace-file/not-found', message: `no ${path}` }
    const entries = Object.entries(node).map(([name, child]) => ({ name, type: typeof child === 'object' ? 'directory' : child }))
    return { ok: true, entries, truncated: cut.has(path) }
  }
  return { list, calls }
}

const signal = new AbortController().signal

describe('listFeatureFiles', () => {
  it('lists every non-hidden file below the Feature directory, BRIEF.md first', async () => {
    const { list, calls } = fakeList({
      'spec': { 'PRD.md': 'file' },
      'BRIEF.md': 'file',
      '.hidden.md': 'file',
      '.cache': { 'secret.md': 'file' },
      'context': { '作业要求.md': 'file', '_INDEX.md': 'file', 'img': { 'a.png': 'file' } },
      'socket': 'other',
    })
    expect(await listFeatureFiles(list, DIR, signal)).toEqual({
      kind: 'ok',
      files: ['BRIEF.md', 'context/_INDEX.md', 'context/img/a.png', 'context/作业要求.md', 'socket', 'spec/PRD.md'],
      incomplete: false,
    })
    // Hidden directories are never opened.
    expect(calls).toEqual([DIR, `${DIR}/spec`, `${DIR}/context`, `${DIR}/context/img`])
  })

  it('lists level 8 and stops before level 9', async () => {
    let tree: Tree = { 'deep.md': 'file' }
    for (let level = 9; level >= 1; level--) tree = { [`d${level}`]: tree, [`f${level - 1}.md`]: 'file' }
    const { list, calls } = fakeList(tree)
    const listing = await listFeatureFiles(list, DIR, signal)
    const dirs = (n: number) => Array.from({ length: n }, (_, i) => `d${i + 1}`).join('/')
    expect(MAX_DEPTH).toBe(8)
    // f0.md at level 0 through d1/…/d8/f8.md at level 8; d9 and its deep.md are not listed.
    const expected = Array.from({ length: 9 }, (_, n) => n === 0 ? 'f0.md' : `${dirs(n)}/f${n}.md`)
    expect(listing.kind === 'ok' && [...listing.files].sort()).toEqual(expected.sort())
    expect(calls).toHaveLength(9)
    expect(calls).not.toContain(`${DIR}/${dirs(9)}`)
  })

  it.each(['workspace-file/not-found', 'workspace-file/outside-workspace'])('reports a Feature directory failing with %s as missing', async (code) => {
    const { list } = fakeList({}, { [DIR]: { ok: false, code, message: 'gone' } })
    expect(await listFeatureFiles(list, DIR, signal)).toEqual({ kind: 'missing' })
  })

  it('reports other Feature directory failures with the Host message', async () => {
    const { list } = fakeList({}, { [DIR]: { ok: false, code: 'workspace-file/not-directory', message: 'not a directory' } })
    expect(await listFeatureFiles(list, DIR, signal)).toEqual({ kind: 'failed', reason: 'not a directory' })
  })

  it('fails the whole listing when a subdirectory cannot be listed, even if it vanished', async () => {
    const { list } = fakeList(
      { 'BRIEF.md': 'file', 'spec': {} },
      { [`${DIR}/spec`]: { ok: false, code: 'workspace-file/not-found', message: 'spec vanished' } },
    )
    expect(await listFeatureFiles(list, DIR, signal)).toEqual({ kind: 'failed', reason: 'spec vanished' })
  })

  it('passes the caller signal to every request', async () => {
    const seen: AbortSignal[] = []
    const own = new AbortController().signal
    const list: ListDirectory = async (path, s) => {
      seen.push(s)
      return { ok: true, entries: path === DIR ? [{ name: 'a', type: 'directory' }] : [], truncated: false }
    }
    expect(await listFeatureFiles(list, DIR, own)).toEqual({ kind: 'ok', files: [], incomplete: false })
    expect(seen).toEqual([own, own])
  })
})

describe('listFeatureFiles limits', () => {
  it('reads exactly MAX_ENTRIES entries as a complete listing', async () => {
    // AC-10 (f): 1998 files and one directory at the top, one file inside it: 2000 entries.
    expect(MAX_ENTRIES).toBe(2000)
    const { list, calls } = fakeList({ ...manyFiles(1998), sub: { 'x.md': 'file' } })
    const listing = await listFeatureFiles(list, DIR, signal)
    expect(listing.kind === 'ok' && [listing.files.length, listing.incomplete]).toEqual([1999, false])
    expect(calls).toEqual([DIR, `${DIR}/sub`])
  })

  it('stops at the entry past MAX_ENTRIES, lists no further directory, and marks the listing incomplete', async () => {
    // AC-10 (d): 1997 files and two directories at the top (1999), two files in each below.
    // The first file of d1 is entry 2000; the second is entry 2001, so d2 is never listed.
    const { list, calls } = fakeList({ ...manyFiles(1997), d1: { 'a.md': 'file', 'b.md': 'file' }, d2: { 'c.md': 'file', 'd.md': 'file' } })
    const listing = await listFeatureFiles(list, DIR, signal)
    expect(listing.kind === 'ok' && [listing.files.length, listing.files.includes('d1/a.md'), listing.incomplete]).toEqual([1998, true, true])
    expect(calls).toEqual([DIR, `${DIR}/d1`])
  })

  it('stops inside the first directory listing when it alone passes the limit', async () => {
    const { list, calls } = fakeList({ ...manyFiles(MAX_ENTRIES), late: { 'x.md': 'file' } })
    const listing = await listFeatureFiles(list, DIR, signal)
    expect(listing.kind === 'ok' && [listing.files.length, listing.incomplete]).toEqual([MAX_ENTRIES, true])
    expect(calls).toEqual([DIR])
  })

  it('does not count hidden entries', async () => {
    const { list } = fakeList({ ...manyFiles(MAX_ENTRIES), '.git': manyFiles(5), '.DS_Store': 'file' })
    const listing = await listFeatureFiles(list, DIR, signal)
    expect(listing.kind === 'ok' && [listing.files.length, listing.incomplete]).toEqual([MAX_ENTRIES, false])
  })

  it('marks a listing the Host cut short as incomplete and still lists the other directories', async () => {
    // AC-10 (e).
    const { list, calls } = fakeList({ spec: { 'PRD.md': 'file' }, test: { 'PLAN.md': 'file' } }, {}, new Set([`${DIR}/spec`]))
    expect(await listFeatureFiles(list, DIR, signal)).toEqual({ kind: 'ok', files: ['spec/PRD.md', 'test/PLAN.md'], incomplete: true })
    expect(calls).toEqual([DIR, `${DIR}/spec`, `${DIR}/test`])
  })

  it('reports a failed subdirectory as failed even after a Host cut', async () => {
    const { list } = fakeList(
      { spec: {}, test: {} },
      { [`${DIR}/test`]: { ok: false, code: 'workspace-file/io', message: 'test unreadable' } },
      new Set([`${DIR}/spec`]),
    )
    expect(await listFeatureFiles(list, DIR, signal)).toEqual({ kind: 'failed', reason: 'test unreadable' })
  })
})

describe('sortFiles', () => {
  it('puts BRIEF.md first and the rest in code-point order, uppercase before lowercase', () => {
    expect(sortFiles(['spec/PRD.md', 'b.md', 'BRIEF.md', 'B.md', 'a.md', 'a/b.md', 'a.md.bak'])).toEqual(
      ['BRIEF.md', 'B.md', 'a.md', 'a.md.bak', 'a/b.md', 'b.md', 'spec/PRD.md'],
    )
  })

  it('keeps only the top-level BRIEF.md pinned', () => {
    expect(sortFiles(['spec/BRIEF.md', 'a.md', 'BRIEF.md'])).toEqual(['BRIEF.md', 'a.md', 'spec/BRIEF.md'])
  })

  it('orders astral characters by code point rather than by UTF-16 unit', () => {
    // U+FF08 FULLWIDTH LEFT PARENTHESIS < U+1F600 GRINNING FACE, though '😀' < '（' by UTF-16 unit.
    expect(sortFiles(['😀.md', '（.md'])).toEqual(['（.md', '😀.md'])
    expect(sortFiles(['😁.md', '😀.md'])).toEqual(['😀.md', '😁.md'])
  })

  it('does not change its input', () => {
    const input = ['b.md', 'a.md']
    sortFiles(input)
    expect(input).toEqual(['b.md', 'a.md'])
  })
})
