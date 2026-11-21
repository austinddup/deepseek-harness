/**
 * The zh and en dictionaries against the Feature PRD's final copy table.
 *
 * The table is read from the PRD at test time, so a change on either side
 * without the other fails here. The other six languages are AI translations
 * outside the PRD; the repository's dictionary parity check covers their keys.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { en, zh, type SddWorkbenchKey } from '../src/client/locales.ts'

const PRD = new URL('../../../../mai-specs/999-sdd-workbench/spec/PRD.md', import.meta.url)

/** Where each PRD copy id lives in the dictionaries. */
const KEYS: Record<string, SddWorkbenchKey> = {
  'COPY-01': 'title',
  'COPY-02': 'guide.description',
  'COPY-03': 'refresh',
  'COPY-04': 'section',
  'COPY-05': 'state.noWorkspace',
  'COPY-06': 'state.uninitialized',
  'COPY-07': 'state.noFeatures',
  'COPY-08': 'state.roadmapFailed',
  'COPY-09': 'feature.missing',
  'COPY-10': 'feature.empty',
  'COPY-11': 'filter',
  'COPY-12': 'filter.noMatch',
  'COPY-13': 'feature.failed',
  'COPY-14': 'refresh.failed',
  'COPY-15': 'feature.incomplete',
  'COPY-16': 'roadmap.tooLarge',
  'COPY-17': 'section.in-progress',
  'COPY-18': 'section.planned',
  'COPY-19': 'section.done',
}

/** Rows of the final copy table: id, place, zh, en, variable rules. */
function copyTable(markdown: string): Map<string, { zh: string; en: string }> {
  const rows = new Map<string, { zh: string; en: string }>()
  for (const line of markdown.split('\n')) {
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim())
    const [id = '', , zhText = '', enText = ''] = cells
    if (cells.length === 5 && /^COPY-\d+$/.test(id)) rows.set(id, { zh: zhText, en: enText })
  }
  return rows
}

describe('sddWorkbench copy', () => {
  const table = copyTable(readFileSync(PRD, 'utf8'))

  it('maps every PRD copy id, and only those', () => {
    expect([...table.keys()].sort()).toEqual(Object.keys(KEYS).sort())
    expect(new Set(Object.values(KEYS))).toEqual(new Set(Object.keys(zh)))
  })

  it.each(Object.entries(KEYS))('%s matches the PRD word for word in zh and en', (id, key) => {
    expect({ zh: zh[key], en: en[key] }).toEqual(table.get(id))
  })
})
