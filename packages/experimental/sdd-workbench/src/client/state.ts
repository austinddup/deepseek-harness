/** The workbench page's state: what is loaded, what is expanded, and what is filtered. */
import type { FileListing } from './feature-files.ts'
import { ROADMAP_TOO_LARGE, type ReadRoadmap } from './face.ts'
import type { FilteredFeature } from './filter.ts'
import { parseRoadmap, SECTIONS, type Roadmap, type RoadmapFeature, type SectionKey } from './roadmap.ts'

/** Why a ROADMAP read failed: the Host's message, or the page's own over-limit reason, worded in the current language. */
export type Reason = { readonly kind: 'host'; readonly message: string } | { readonly kind: 'too-large' }

/** The ROADMAP as the page knows it. */
export type Load =
  | { readonly kind: 'no-workspace' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'uninitialized' }
  | { readonly kind: 'failed'; readonly reason: Reason }
  | {
    readonly kind: 'ready'
    readonly roadmap: Roadmap
    /** A refresh is under way; the list stays shown. */
    readonly refreshing: boolean
    /** The last refresh failed with this message; the list is the one before it. */
    readonly refreshError: Reason | undefined
  }

/** Everything the page shows: the loaded list, file listings, expansion, and the filter. */
export interface WorkbenchState {
  readonly load: Load
  /** File listings by Feature directory; Features sharing a directory share one listing. */
  readonly files: ReadonlyMap<string, FileListing>
  /** Row keys the user expanded in the full list. */
  readonly expanded: ReadonlySet<string>
  /** Sections the user collapsed; every section starts expanded. */
  readonly collapsed: ReadonlySet<SectionKey>
  /** The search box text. */
  readonly query: string
  /** Row keys the user toggled while this query was active; cleared with the query. */
  readonly filterToggled: ReadonlySet<string>
}

/** One change to the page state, dispatched by the page or by a finished read. */
export type WorkbenchAction =
  | { readonly type: 'reset'; readonly workspace: boolean }
  | { readonly type: 'start' }
  | { readonly type: 'loaded'; readonly load: Load }
  | { readonly type: 'files'; readonly dir: string; readonly listing: FileListing }
  | { readonly type: 'toggle-feature'; readonly key: string }
  | { readonly type: 'toggle-section'; readonly section: SectionKey }
  | { readonly type: 'query'; readonly query: string }

/**
 * A fresh page for a Session.
 * @param workspace - whether the Session has a working directory.
 * @returns the state before the first read.
 */
export function initialState(workspace: boolean): WorkbenchState {
  return {
    load: workspace ? { kind: 'loading' } : { kind: 'no-workspace' },
    files: new Map(), expanded: new Set(), collapsed: new Set(), query: '', filterToggled: new Set(),
  }
}

/**
 * Read and parse the ROADMAP once.
 * @param previous - the state before this read; a shown list survives a failed refresh.
 * @param read - the injected read.
 * @param signal - cancels the read.
 * @returns the next load state.
 */
export async function load(previous: Load, read: ReadRoadmap, signal: AbortSignal): Promise<Load> {
  const answer = await read(signal)
  if (answer.ok) return { kind: 'ready', roadmap: parseRoadmap(answer.text), refreshing: false, refreshError: undefined }
  const reason: Reason = answer.code === ROADMAP_TOO_LARGE ? { kind: 'too-large' } : { kind: 'host', message: answer.message }
  if (previous.kind === 'ready') return { ...previous, refreshing: false, refreshError: reason }
  return answer.code === 'workspace-file/not-found' ? { kind: 'uninitialized' } : { kind: 'failed', reason }
}

function toggled<T>(set: ReadonlySet<T>, item: T): ReadonlySet<T> {
  const next = new Set(set)
  if (!next.delete(item)) next.add(item)
  return next
}

/**
 * The page's reducer.
 * @param state - the current state.
 * @param action - what happened.
 * @returns the next state.
 */
export function reduce(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
  switch (action.type) {
    case 'reset':
      return initialState(action.workspace)
    case 'start': {
      // Listings still in flight belong to the read being replaced and will be dropped; forget them so they are asked again.
      const files = new Map([...state.files].filter(([, listing]) => listing.kind !== 'loading'))
      const load: Load = state.load.kind === 'ready' ? { ...state.load, refreshing: true } : { kind: 'loading' }
      return { ...state, load, files }
    }
    case 'loaded': {
      if (action.load.kind !== 'ready' || action.load.refreshError !== undefined) return { ...state, load: action.load }
      // A successful read starts the listings over, collapsed Features included, and forgets rows that are gone.
      const keys = new Set(allFeatures(action.load.roadmap).map(feature => feature.key))
      const expanded = new Set([...state.expanded].filter(key => keys.has(key)))
      return { ...state, load: action.load, files: new Map(), expanded }
    }
    case 'files':
      return { ...state, files: new Map(state.files).set(action.dir, action.listing) }
    case 'toggle-feature':
      return state.query.trim() === ''
        ? { ...state, expanded: toggled(state.expanded, action.key) }
        : { ...state, filterToggled: toggled(state.filterToggled, action.key) }
    case 'toggle-section':
      return { ...state, collapsed: toggled(state.collapsed, action.section) }
    case 'query':
      return { ...state, query: action.query, filterToggled: action.query.trim() === '' ? new Set() : state.filterToggled }
  }
}

/**
 * Every Feature of the list, in display order.
 * @param roadmap - the parsed ROADMAP sections.
 * @returns the Features of all sections, section by section.
 */
export function allFeatures(roadmap: Roadmap): RoadmapFeature[] {
  return SECTIONS.flatMap(({ key }) => [...roadmap[key]])
}

/**
 * The Feature directories whose listings the page needs: the expanded ones,
 * and while a query is active every one, since files take part in matching.
 * Out-of-bounds Features are never listed.
 * @param state - the current state.
 * @returns distinct directories without a listing yet.
 */
export function wantedDirs(state: WorkbenchState): string[] {
  if (state.load.kind !== 'ready' || state.load.refreshing) return []
  const filtering = state.query.trim() !== ''
  const dirs = new Set<string>()
  for (const feature of allFeatures(state.load.roadmap)) {
    if (feature.dir.kind !== 'inside') continue
    if (filtering || state.expanded.has(feature.key)) dirs.add(feature.dir.path)
  }
  return [...dirs].filter(dir => !state.files.has(dir))
}

/**
 * Whether a Feature row is open. Without a query it follows the user's
 * choice. With one, a Feature matched only through files opens by itself, one
 * matched by id or title keeps the user's choice, and each toggle under the
 * query flips that.
 * @param state - the current state.
 * @param feature - the row's Feature.
 * @param filtered - the row's filter result, when a query is active.
 * @returns whether the row shows its files.
 */
export function isOpen(state: WorkbenchState, feature: RoadmapFeature, filtered: FilteredFeature | undefined): boolean {
  const own = state.expanded.has(feature.key)
  if (filtered === undefined) return own
  const automatic = filtered.onlyFiles !== undefined || own
  return automatic !== state.filterToggled.has(feature.key)
}
