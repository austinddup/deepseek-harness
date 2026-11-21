/**
 * Parse `mai-specs/ROADMAP.md` into the workbench's grouped Feature list, and
 * decide which Feature directories the workbench may read.
 */
import { compareCodePoints } from './code-point.ts'

/** The three level-2 headings the workbench reads, in display order. */
export const SECTIONS = [
  { key: 'in-progress', heading: '进行中' },
  { key: 'planned', heading: '规划中' },
  { key: 'done', heading: '已完成' },
] as const

/** Which ROADMAP section a row came from. */
export type SectionKey = typeof SECTIONS[number]['key']

/** Where a row's Feature directory lies; only `inside` directories are ever listed. */
export type FeatureDir =
  | { readonly kind: 'inside'; readonly path: string }
  | { readonly kind: 'outside' }

/** One usable ROADMAP row. */
export interface RoadmapFeature {
  /** `${section}:${link}:${occurrence}`; inserting or removing other rows leaves it unchanged. */
  readonly key: string
  readonly section: SectionKey
  readonly id: string
  readonly title: string
  /** `undefined` when the cell is empty or the table has no priority column. */
  readonly priority: string | undefined
  /** The title link's target as written, shown when the directory is missing. */
  readonly link: string
  readonly dir: FeatureDir
}

/** Rows grouped by section, each group in {@link compareIds} order. */
export type Roadmap = Readonly<Record<SectionKey, readonly RoadmapFeature[]>>

interface Columns {
  readonly id: number
  readonly title: number
  readonly priority: number | undefined
}

/**
 * Group the usable rows of each section, ordered by {@link compareIds}. A missing heading, a heading with no
 * table, or a table without 需求 and 标题 columns yields an empty section.
 * Rows without an id, a titled link, or a relative link target are skipped.
 * @param markdown - the ROADMAP text.
 * @returns the rows of every section.
 */
export function parseRoadmap(markdown: string): Roadmap {
  const result: Record<SectionKey, RoadmapFeature[]> = { 'in-progress': [], planned: [], done: [] }
  const lines = markdown.split(/\r?\n/)
  for (const { key: section, heading } of SECTIONS) {
    const table = firstTable(sectionBody(lines, heading))
    if (table === undefined) continue
    const col = columnIndex(table.header)
    if (col === undefined) continue
    const seen = new Map<string, number>()
    for (const cells of table.rows) {
      const row = parseRow(cells, col)
      if (row === undefined) continue
      const n = seen.get(row.link) ?? 0
      seen.set(row.link, n + 1)
      result[section].push({ ...row, section, key: `${section}:${row.link}:${n}` })
    }
    // Stable: rows with equal ids keep their ROADMAP order.
    result[section].sort((x, y) => compareIds(x.id, y.id))
  }
  return result
}

const NUMERIC_ID = /^\d+$/

/**
 * Order Feature ids so the newest Feature comes first: my-ai-infra assigns
 * numbers downward, so ascending numeric order puts it on top. Numeric ids
 * compare by value and precede every other id, which compare by code point.
 * @param a - the first id.
 * @param b - the second id.
 * @returns a sort comparator result; zero for ids of equal value, such as `7` and `007`.
 */
export function compareIds(a: string, b: string): number {
  const numericA = NUMERIC_ID.test(a)
  const numericB = NUMERIC_ID.test(b)
  if (numericA && numericB) return Number(a) - Number(b)
  if (numericA !== numericB) return numericA ? -1 : 1
  return compareCodePoints(a, b)
}

/** Lines after the first `## heading` up to the next level-1 or level-2 heading; empty when absent. */
function sectionBody(lines: readonly string[], heading: string): readonly string[] {
  const start = lines.findIndex(line => /^##\s/.test(line) && line.slice(2).trim() === heading)
  if (start < 0) return []
  const rest = lines.slice(start + 1)
  const end = rest.findIndex(line => /^#{1,2}\s/.test(line))
  return end < 0 ? rest : rest.slice(0, end)
}

const DELIMITER_CELL = /^:?-+:?$/

/** The first run of `|` lines that has a header and a delimiter row. */
function firstTable(lines: readonly string[]): { header: readonly string[]; rows: readonly (readonly string[])[] } | undefined {
  const run: string[] = []
  for (const line of lines) {
    if (line.trim().startsWith('|')) run.push(line)
    else if (run.length > 0) break
  }
  const [header, delimiter, ...rows] = run.map(splitCells)
  if (header === undefined || delimiter === undefined || !delimiter.every(cell => DELIMITER_CELL.test(cell))) return undefined
  return { header, rows }
}

/** Split a table row on unescaped `|`, trimming cells and unescaping `\|`. */
function splitCells(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '')
  return inner.split(/(?<!\\)\|/).map(cell => cell.replace(/\\\|/g, '|').trim())
}

function columnIndex(header: readonly string[]): Columns | undefined {
  const id = header.indexOf('需求')
  const title = header.indexOf('标题')
  if (id < 0 || title < 0) return undefined
  const priority = header.indexOf('优先级')
  return { id, title, priority: priority < 0 ? undefined : priority }
}

function parseRow(cells: readonly string[], col: Columns): Omit<RoadmapFeature, 'key' | 'section'> | undefined {
  const id = cells[col.id] ?? ''
  const link = firstMarkdownLink(cells[col.title] ?? '')
  if (id === '' || link === undefined || link.text === '') return undefined
  const dir = resolveFeatureDir(link.target)
  if (dir === undefined) return undefined
  const priority = col.priority === undefined ? undefined : cells[col.priority] || undefined
  return { id, title: link.text, priority, link: link.target, dir }
}

/** `[text](target "title")` or `[text](<target>)`, skipping images. */
const LINK = /(?<!!)\[([^\]]*)\]\(\s*(<[^>]*>|[^\s)]*)(?:\s+"[^"]*")?\s*\)/

function firstMarkdownLink(cell: string): { text: string; target: string } | undefined {
  const match = LINK.exec(cell)
  if (match === null) return undefined
  const [, text = '', target = ''] = match
  return { text: text.trim(), target }
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/i

/**
 * Resolve a ROADMAP link target, relative to `mai-specs/`, to its Feature directory.
 * Normalization runs before the prefix check, so `999-x/../../src/BRIEF.md` is outside.
 * @param target - the link target as written.
 * @returns `undefined` when the target is not a usable relative path (URL, absolute
 * path, anchor, or invalid percent-encoding); `outside` when its parent directory is
 * not below `mai-specs/`; otherwise the Workspace-relative directory.
 */
export function resolveFeatureDir(target: string): FeatureDir | undefined {
  let t = target.trim()
  if (t.startsWith('<') && t.endsWith('>')) t = t.slice(1, -1)
  if (t === '' || t.startsWith('#') || t.startsWith('/') || t.startsWith('\\') || SCHEME.test(t)) return undefined
  const raw = t.replace(/[?#][\s\S]*$/, '')
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return undefined
  }
  const file = posixNormalize(`mai-specs/${decoded.replace(/\\/g, '/')}`)
  const slash = file.lastIndexOf('/')
  const parent = slash < 0 ? '' : file.slice(0, slash)
  if (!parent.startsWith('mai-specs/')) return { kind: 'outside' }
  return { kind: 'inside', path: parent }
}

/** Collapse empty, `.`, and `..` segments of a relative POSIX path; unmatched `..` stay leading. */
function posixNormalize(path: string): string {
  const out: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..' && out.length > 0 && out[out.length - 1] !== '..') out.pop()
    else out.push(part)
  }
  return out.join('/')
}
