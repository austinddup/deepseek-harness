import { describe, expect, it } from 'vitest'
import { compareIds, parseRoadmap, resolveFeatureDir } from '../src/client/roadmap.ts'

const FIVE = '| 需求 | 标题 | 规格 | 优先级 | 说明 |\n|---|---|---|---|---|'
const FOUR = '| 需求 | 标题 | 优先级 | 说明 |\n| :-- | --- | :-: | --: |'

describe('parseRoadmap', () => {
  it('groups the three sections in display order, reading five- and four-column tables and skipping invalid rows', () => {
    const roadmap = parseRoadmap([
      '# 需求路线图',
      '',
      '## 规划中',
      '',
      FIVE,
      '| 999 | [SDD 工作台](999-sdd-workbench/BRIEF.md) | standard | P1 | 说明 |',
      '| 998 |  | standard | P1 | 缺标题 |',
      '| 997 | 纯文本标题 | standard | P1 | 无链接 |',
      '| 996 | [外链](https://example.com/a.md) | standard | P1 | URL |',
      '|  | [缺编号](995-x/BRIEF.md) | standard | P1 | 缺编号 |',
      '| 994 | [](994-x/BRIEF.md) | standard | P1 | 空链接文字 |',
      '| 993 | [无优先级](993-x/BRIEF.md) | standard |  | 优先级为空 |',
      '',
      '## 已完成',
      '',
      FOUR,
      '| 001 | [旧需求](001-old/BRIEF.md) | P2 | 四列 |',
    ].join('\n'))

    expect(Object.keys(roadmap)).toEqual(['in-progress', 'planned', 'done'])
    expect(roadmap['in-progress']).toEqual([])
    expect(roadmap.planned).toEqual([
      {
        key: 'planned:993-x/BRIEF.md:0', section: 'planned', id: '993', title: '无优先级',
        priority: undefined, link: '993-x/BRIEF.md', dir: { kind: 'inside', path: 'mai-specs/993-x' },
      },
      {
        key: 'planned:999-sdd-workbench/BRIEF.md:0', section: 'planned', id: '999', title: 'SDD 工作台',
        priority: 'P1', link: '999-sdd-workbench/BRIEF.md', dir: { kind: 'inside', path: 'mai-specs/999-sdd-workbench' },
      },
    ])
    expect(roadmap.done.map(f => [f.id, f.title, f.priority, f.dir])).toEqual([
      ['001', '旧需求', 'P2', { kind: 'inside', path: 'mai-specs/001-old' }],
    ])
  })

  it('keeps row keys stable when a row is inserted before 999', () => {
    const before = parseRoadmap(`## 规划中\n\n${FIVE}\n| 999 | [A](999-a/BRIEF.md) | s | P1 | |`)
    const after = parseRoadmap(`## 规划中\n\n${FIVE}\n| 990 | [R](990-r/BRIEF.md) | s | P2 | |\n| 999 | [A](999-a/BRIEF.md) | s | P1 | |`)
    expect(after.planned.map(f => f.id)).toEqual(['990', '999'])
    expect(after.planned[1]!.key).toBe(before.planned[0]!.key)
  })

  it('shows duplicate rows one by one with distinct keys', () => {
    const roadmap = parseRoadmap(`## 进行中\n${FIVE}\n| 5 | [X](5-x/BRIEF.md) | s | P1 | |\n| 5 | [X](5-x/BRIEF.md) | s | P1 | |`)
    expect(roadmap['in-progress'].map(f => f.key)).toEqual(['in-progress:5-x/BRIEF.md:0', 'in-progress:5-x/BRIEF.md:1'])
  })

  it('treats unrecognized structure as an empty section', () => {
    const roadmap = parseRoadmap([
      '## 进行中（2）', FIVE, '| 1 | [a](1-a/BRIEF.md) | s | P1 | |', // heading text differs
      '## 规划中', 'no table here', // heading without a table
      '## 已完成', '| 需求 | 名称 |', '|---|---|', '| 2 | [b](2-b/BRIEF.md) |', // no 标题 column
    ].join('\n'))
    expect(roadmap).toEqual({ 'in-progress': [], planned: [], done: [] })
    expect(parseRoadmap('')).toEqual({ 'in-progress': [], planned: [], done: [] })
  })

  it('requires a delimiter row and ends a section only at a level-1 or level-2 heading', () => {
    const roadmap = parseRoadmap([
      '## 进行中', '| 需求 | 标题 |', '| 1 | [a](1-a/BRIEF.md) |', // no delimiter row
      '## 规划中', '| 需求 | 标题 |', // header only
      '## 已完成', '### 子标题', FIVE, '| 3 | [c](3-c/BRIEF.md) | s | P1 | |',
    ].join('\r\n'))
    expect(roadmap['in-progress']).toEqual([])
    expect(roadmap.planned).toEqual([])
    expect(roadmap.done.map(f => f.id)).toEqual(['3']) // a level-3 heading stays inside the section
  })

  it('reads only the first table of a section and keeps escaped pipes in titles', () => {
    const roadmap = parseRoadmap([
      '## 规划中', '', '说明文字', FIVE,
      '| 7 | [A \\| B](7-ab/BRIEF.md "提示") | s | P1 | |',
      '| 8 | ![图](8-img.png) [图后链接](8-x/BRIEF.md) | s | P1 | |',
      '', '| 需求 | 标题 |', '|---|---|', '| 9 | [第二张表](9-x/BRIEF.md) |',
    ].join('\n'))
    expect(roadmap.planned.map(f => [f.id, f.title, f.link])).toEqual([
      ['7', 'A | B', '7-ab/BRIEF.md'],
      ['8', '图后链接', '8-x/BRIEF.md'],
    ])
  })

  it('keeps out-of-bounds rows visible with an outside directory', () => {
    const roadmap = parseRoadmap(`## 进行中\n${FIVE}\n| TMP-A | [甲](../../outside/BRIEF.md) | s | P2 | |\n| TMP-B | [乙](../src/BRIEF.md) | s | P2 | |`)
    expect(roadmap['in-progress'].map(f => [f.id, f.link, f.dir])).toEqual([
      ['TMP-A', '../../outside/BRIEF.md', { kind: 'outside' }],
      ['TMP-B', '../src/BRIEF.md', { kind: 'outside' }],
    ])
  })

  it('reads the missing cells of short rows as empty', () => {
    const roadmap = parseRoadmap(`## 规划中\n${FIVE}\n| 1 |\n| 2 | [b](2-b/BRIEF.md) |`)
    expect(roadmap.planned.map(f => [f.id, f.priority])).toEqual([['2', undefined]])
  })

  it('reads a table without a priority column', () => {
    const roadmap = parseRoadmap('## 规划中\n| 标题 | 需求 |\n|---|---|\n| [a](1-a/BRIEF.md) |\n| [b](2-b/BRIEF.md) | 2 |')
    expect(roadmap.planned.map(f => [f.id, f.priority])).toEqual([['2', undefined]])
  })
})

describe('Feature order', () => {
  it('orders each section by id so the newest Feature is on top, keeping ROADMAP order for equal ids', () => {
    const row = (id: string, link: string) => `| ${id} | [${link}](${link}/BRIEF.md) | s | P1 | |`
    const roadmap = parseRoadmap(['## 进行中', FIVE,
      row('999', 'a'), row('TMP-B', 'b'), row('1000', 'c'), row('998', 'd'), row('TMP-A', 'e'), row('7', 'f'), row('007', 'g'), row('7', 'h'),
    ].join('\n'))
    expect(roadmap['in-progress'].map(f => `${f.id}:${f.title}`)).toEqual(
      ['7:f', '007:g', '7:h', '998:d', '999:a', '1000:c', 'TMP-A:e', 'TMP-B:b'],
    )
  })

  it('places a row inserted into the ROADMAP by its id, not by its line', () => {
    const roadmap = parseRoadmap(`## 规划中\n${FIVE}\n| 999 | [A](999-a/BRIEF.md) | s | P1 | |\n| 998 | [B](998-b/BRIEF.md) | s | P1 | |`)
    expect(roadmap.planned.map(f => f.id)).toEqual(['998', '999'])
  })

  it('compares ids numerically first, then by code point', () => {
    expect(compareIds('9', '10')).toBeLessThan(0)
    expect(compareIds('007', '7')).toBe(0)
    expect(compareIds('999', 'A-1')).toBeLessThan(0)
    expect(compareIds('A-1', '999')).toBeGreaterThan(0)
    expect(compareIds('12a', '12')).toBeGreaterThan(0)
    expect(compareIds('B', 'a')).toBeLessThan(0)
  })
})

describe('resolveFeatureDir', () => {
  it.each([
    ['999-sdd-workbench/BRIEF.md', 'mai-specs/999-sdd-workbench'],
    ['./999-x/BRIEF.md#背景', 'mai-specs/999-x'],
    ['999-x/BRIEF.md?raw=1', 'mai-specs/999-x'],
    ['998-%E6%90%9C%E7%B4%A2/BRIEF.md', 'mai-specs/998-搜索'],
    ['<997 a b/BRIEF.md>', 'mai-specs/997 a b'],
    ['996-x//sub/./BRIEF.md', 'mai-specs/996-x/sub'],
    ['995-x\\BRIEF.md', 'mai-specs/995-x'],
    ['../mai-specs/994-x/BRIEF.md', 'mai-specs/994-x'],
  ])('resolves %s inside mai-specs', (target, path) => {
    expect(resolveFeatureDir(target)).toEqual({ kind: 'inside', path })
  })

  it.each([
    '../../outside/BRIEF.md',
    '../BRIEF.md',
    '../src/x.md',
    '999-x/../../src/x.md',
    '%2E%2E/src/BRIEF.md',
    'ROADMAP.md',
    '../../../../a/b.md',
  ])('marks %s outside', (target) => {
    expect(resolveFeatureDir(target)).toEqual({ kind: 'outside' })
  })

  it.each([
    'https://example.com/a.md',
    'mailto:a@b.c',
    '/abs/BRIEF.md',
    '\\abs\\BRIEF.md',
    '#top',
    '',
    '<>',
    '%E4%BD/BRIEF.md',
  ])('rejects %s as an unusable link', (target) => {
    expect(resolveFeatureDir(target)).toBeUndefined()
  })
})
