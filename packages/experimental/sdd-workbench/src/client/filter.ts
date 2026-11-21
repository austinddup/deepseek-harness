/** Filter the Feature list by the search box, following the Client search rule. */
import { TextSearchIndex, type SearchKeys } from '@deepseek-ai/dsh-util-text-search'
import { sortFiles, type FileListing } from './feature-files.ts'
import { SECTIONS, type Roadmap, type RoadmapFeature, type SectionKey } from './roadmap.ts'

/**
 * One searchable entry: a Feature itself (`path` undefined), or one of its
 * listed files. A file entry also carries its Feature's id and title, so a
 * query such as `999 prd` matches a file through both.
 */
export interface SearchItem {
  readonly feature: RoadmapFeature
  readonly path: string | undefined
}

/** The cached listing of a Feature directory, or `undefined` before it was requested. */
export type FilesOf = (dir: string) => FileListing | undefined

/** Ids and titles match fuzzily; file paths match only as substrings. */
function searchKeys(item: SearchItem): SearchKeys {
  return {
    fuzzy: [item.feature.id, item.feature.title],
    substring: item.path === undefined ? [] : [item.path],
  }
}

/**
 * Index every Feature and every file of the Features whose listing is cached.
 * Features without a cached listing match by id and title only, until the
 * listing arrives and the index is rebuilt.
 * @param roadmap - the parsed Feature list, already in display order.
 * @param filesOf - the listing cache.
 * @param previous - the index this one replaces, whose prepared keys are reused.
 * @returns the index; equal scores keep its build order, which is the display order.
 */
export function buildIndex(roadmap: Roadmap, filesOf: FilesOf, previous?: TextSearchIndex<SearchItem>): TextSearchIndex<SearchItem> {
  const items: SearchItem[] = []
  for (const { key } of SECTIONS) {
    for (const feature of roadmap[key]) {
      items.push({ feature, path: undefined })
      const listing = feature.dir.kind === 'inside' ? filesOf(feature.dir.path) : undefined
      if (listing?.kind === 'ok') for (const path of listing.files) items.push({ feature, path })
    }
  }
  return previous === undefined ? new TextSearchIndex(items, searchKeys) : previous.update(items, searchKeys)
}

/** One Feature shown while a query is active. */
export interface FilteredFeature {
  readonly feature: RoadmapFeature
  /**
   * `undefined` when the id or title matched: expanding shows every file.
   * Otherwise only files matched: the row expands by itself and shows these, in file-list order.
   */
  readonly onlyFiles: readonly string[] | undefined
}

/** Matching Features per section, best match first; an empty section is hidden. */
export type FilteredRoadmap = Readonly<Record<SectionKey, readonly FilteredFeature[]>>

/**
 * Apply a query to the index.
 * @param index - built by {@link buildIndex}.
 * @param query - the search box text.
 * @returns `'all'` for a blank query, so the page shows the full list with its own
 * expansion state; otherwise the matching Features of each section.
 */
export function filterFeatures(index: TextSearchIndex<SearchItem>, query: string): FilteredRoadmap | 'all' {
  if (query.trim() === '') return 'all'
  // Map order is first-hit order, which is best-match order.
  const found = new Map<string, { feature: RoadmapFeature; whole: boolean; files: string[] }>()
  for (const { feature, path } of index.search(query)) {
    let entry = found.get(feature.key)
    if (entry === undefined) {
      entry = { feature, whole: false, files: [] }
      found.set(feature.key, entry)
    }
    if (path === undefined) entry.whole = true
    else entry.files.push(path)
  }
  const out: Record<SectionKey, FilteredFeature[]> = { 'in-progress': [], planned: [], done: [] }
  for (const { feature, whole, files } of found.values()) {
    out[feature.section].push({ feature, onlyFiles: whole ? undefined : sortFiles(files) })
  }
  return out
}
