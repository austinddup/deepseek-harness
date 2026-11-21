import { describe, expect, it } from 'vitest'
import type { FileListing } from '../src/client/feature-files.ts'
import { buildIndex, filterFeatures, type FilesOf, type FilteredRoadmap } from '../src/client/filter.ts'
import { parseRoadmap } from '../src/client/roadmap.ts'

const HEAD = '| 需求 | 标题 | 规格 | 优先级 | 说明 |\n|---|---|---|---|---|'
const row = (id: string, title: string, dir: string) => `| ${id} | [${title}](${dir}/BRIEF.md) | standard | P1 | |`

/** This repository's ROADMAP at acceptance time, plus neighbours for ranking. */
const ROADMAP = parseRoadmap([
  '## 进行中', HEAD,
  row('999', 'SDD 工作台：Feature 导航与规格查看', '999-sdd-workbench'),
  row('TMP-A', '验收越界样例甲', '../../outside'),
  '## 已完成', HEAD,
  row('997', 'Bench tools', '997-bench'),
  row('996', 'Workbench layout', '996-layout'),
].join('\n'))

const FILES: Record<string, FileListing> = {
  'mai-specs/999-sdd-workbench': {
    kind: 'ok',
    files: ['BRIEF.md', 'context/_INDEX.md', 'design/TECH_DESIGN.md', 'review/prd_review.md', 'spec/PRD.md', 'test/TEST_PLAN.md'],
    incomplete: false,
  },
  'mai-specs/997-bench': { kind: 'failed', reason: 'denied' },
}
const filesOf: FilesOf = dir => FILES[dir]

/** `id` for a whole-Feature match, `id: files` for a file-only match, per section. */
function summary(result: FilteredRoadmap | 'all'): unknown {
  if (result === 'all') return 'all'
  return Object.fromEntries(Object.entries(result).map(([section, rows]) =>
    [section, rows.map(({ feature, onlyFiles }) => onlyFiles === undefined ? feature.id : `${feature.id}: ${onlyFiles.join(', ')}`)]))
}

describe('filterFeatures (AC-09)', () => {
  const index = buildIndex(ROADMAP, filesOf)

  it('(a) shows only Feature 999 for `999`, with every file available', () => {
    expect(summary(filterFeatures(index, '999'))).toEqual({ 'in-progress': ['999'], planned: [], done: [] })
  })

  it.each(['prd', 'PRD', 'ｐｒｄ'])('(b) shows only the matching files of 999 for `%s`', (query) => {
    expect(summary(filterFeatures(index, query))).toEqual({
      'in-progress': ['999: review/prd_review.md, spec/PRD.md'], planned: [], done: [],
    })
  })

  it('(c) matches nothing for an unknown word', () => {
    expect(summary(filterFeatures(index, '不存在的词'))).toEqual({ 'in-progress': [], planned: [], done: [] })
  })

  it.each(['', '   '])('(d) returns `all` for the blank query %j', (query) => {
    expect(filterFeatures(index, query)).toBe('all')
  })
})

describe('filterFeatures', () => {
  const index = buildIndex(ROADMAP, filesOf)

  it('requires every term, letting a file match through its Feature id', () => {
    expect(summary(filterFeatures(index, '999 prd'))).toEqual({
      'in-progress': ['999: review/prd_review.md, spec/PRD.md'], planned: [], done: [],
    })
    expect(summary(filterFeatures(index, '997 prd'))).toEqual({ 'in-progress': [], planned: [], done: [] })
  })

  it('matches titles fuzzily from a word start, but paths only as substrings', () => {
    // w…b…l is a subsequence of “Workbench layout” that starts at a word start.
    expect(summary(filterFeatures(index, 'wbl'))).toEqual({ 'in-progress': [], planned: [], done: ['996'] })
    // `tpl` is a scattered subsequence of test/TEST_PLAN.md but not a substring.
    expect(summary(filterFeatures(index, 'tpl'))).toEqual({ 'in-progress': [], planned: [], done: [] })
    expect(summary(filterFeatures(index, 'plan'))).toEqual({ 'in-progress': ['999: test/TEST_PLAN.md'], planned: [], done: [] })
  })

  it('shows every file of a Feature whose title matched, even if its files also matched', () => {
    expect(summary(filterFeatures(index, 'feature'))).toEqual({ 'in-progress': ['999'], planned: [], done: [] })
  })

  it('ranks within a section by match quality, then by display order', () => {
    // 997 “Bench tools” starts with `bench`; 996 “Workbench layout” only contains it, so 997 leads despite its later place.
    expect(summary(filterFeatures(index, 'bench'))).toEqual({ 'in-progress': [], planned: [], done: ['997', '996'] })
    // Both ids start with `99`: equal scores keep the display order, which is id order.
    expect(summary(filterFeatures(index, '99'))).toEqual({ 'in-progress': ['999'], planned: [], done: ['996', '997'] })
  })

  it('matches out-of-bounds and unlisted Features by id and title only', () => {
    expect(summary(filterFeatures(index, '样例'))).toEqual({ 'in-progress': ['TMP-A'], planned: [], done: [] })
    expect(summary(filterFeatures(index, 'BRIEF'))).toEqual({ 'in-progress': ['999: BRIEF.md'], planned: [], done: [] })
  })
})

describe('buildIndex', () => {
  it('picks up a listing that arrived after the first build', () => {
    const cache: Record<string, FileListing> = {}
    const first = buildIndex(ROADMAP, dir => cache[dir])
    expect(summary(filterFeatures(first, 'layout.md'))).toEqual({ 'in-progress': [], planned: [], done: [] })
    cache['mai-specs/996-layout'] = { kind: 'ok', files: ['BRIEF.md', 'design/layout.md'], incomplete: false }
    const second = buildIndex(ROADMAP, dir => cache[dir], first)
    expect(summary(filterFeatures(second, 'layout.md'))).toEqual({ 'in-progress': [], planned: [], done: ['996: design/layout.md'] })
    // The previous index stays valid.
    expect(summary(filterFeatures(first, 'layout.md'))).toEqual({ 'in-progress': [], planned: [], done: [] })
  })
})
