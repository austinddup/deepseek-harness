import { describe, expect, it } from 'vitest'
import { listFeatureFiles, MAX_DEPTH, sortFiles, type ListDirectory, type ListResult } from '../src/client/feature-files.ts'

/** A directory tree: a string value is a file of that type, an object is a directory. */
interface Tree { readonly [name: string]: Tree | 'file' | 'other' }

const DIR = 'mai-specs/999-x'

/** Serves `tree` as the contents of DIR, recording every path it is asked to list. */
function fakeList(tree: Tree, failures: Readonly<Record<string, ListResult>> = {}): { list: ListDirectory; calls: string[] } {
  const calls: string[] = []
  const list: ListDirectory = async (path) => {
    calls.push(path)
    const failure = failures[path]
    if (failure !== undefined) return failure
    let node: Tree | 'file' | 'other' | undefined = tree
    for (const part of path.slice(DIR.length).split('/').filter(Boolean)) node = typeof node === 'object' ? node[part] : undefined
    if (typeof node !== 'object') return { ok: false, code: 'workspace-file/not-found', message: `no ${path}` }
    return { ok: true, entries: Object.entries(node).map(([name, child]) => ({ name, type: typeof child === 'object' ? 'directory' : child })) }
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
      return { ok: true, entries: path === DIR ? [{ name: 'a', type: 'directory' }] : [] }
    }
    expect(await listFeatureFiles(list, DIR, own)).toEqual({ kind: 'ok', files: [] })
    expect(seen).toEqual([own, own])
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
