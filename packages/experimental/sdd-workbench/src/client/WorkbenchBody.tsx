/**
 * The workbench page: a header with the refresh control, the search box, and
 * the ROADMAP's Features as a tree of sections, Features, and files. Reads go
 * through the two injected callbacks; a file opens in the document preview.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import clsx from 'clsx'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  FileTypeIcon, IconChevronDownOutlineRegular, IconChevronRightOutlineRegular, IconRefreshOutlineRegular,
  IconSearchOutlineRegular, Input, PathLabel, StateDot, Tooltip, classifyFileType,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { TextSearchIndex } from '@deepseek-ai/dsh-util-text-search'
import { fileAddressFor } from '@deepseek-ai/dsh-util-workspace-path'
import { listFeatureFiles } from './feature-files.ts'
import type { WorkbenchInjected } from './face.ts'
import { buildIndex, filterFeatures, type FilteredFeature, type FilteredRoadmap, type SearchItem } from './filter.ts'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from './locales.ts'
import { SECTIONS, type Roadmap, type RoadmapFeature, type SectionKey } from './roadmap.ts'
import { allFeatures, initialState, isOpen, load, reduce, wantedDirs, type Reason, type WorkbenchState } from './state.ts'
import css from './WorkbenchBody.module.css'

/** Props the `sidebar.right.pane.tab` seat passes to this body. */
export type WorkbenchBodyProps =
  & PropsRuntime<'sidebar.right.pane.tab'>
  & InjectFace<WorkbenchInjected>
  & PropsLocale<'sddWorkbench'>

type Translate = WorkbenchBodyProps['t']

/** One drawn line of the tree, in display order. */
type Row =
  | { readonly kind: 'section'; readonly key: string; readonly section: SectionKey; readonly label: string; readonly open: boolean }
  | { readonly kind: 'feature'; readonly key: string; readonly feature: RoadmapFeature; readonly open: boolean }
  | { readonly kind: 'file'; readonly key: string; readonly dir: string; readonly path: string }
  | { readonly kind: 'note'; readonly key: string; readonly text: string | undefined }

/** A row that takes focus. */
type Focusable = Exclude<Row, { readonly kind: 'note' }>

/** A row that expands and collapses. */
type Expandable = Extract<Row, { readonly kind: 'section' | 'feature' }>

const LEVEL = { section: 1, feature: 2, file: 3, note: 3 } as const

/**
 * Lay out the visible rows.
 * @param state - the page state.
 * @param roadmap - the shown Feature list.
 * @param filtered - the filter result, or `'all'` without a query.
 * @param t - copy.
 * @returns the rows, sections first in their fixed order.
 */
function rowsOf(state: WorkbenchState, roadmap: Roadmap, filtered: FilteredRoadmap | 'all', t: Translate): Row[] {
  const rows: Row[] = []
  for (const { key: section, heading } of SECTIONS) {
    const entries: readonly { feature: RoadmapFeature; filtered: FilteredFeature | undefined }[] = filtered === 'all'
      ? roadmap[section].map(feature => ({ feature, filtered: undefined }))
      : filtered[section].map(match => ({ feature: match.feature, filtered: match }))
    // A query hides the sections it matches nothing in.
    if (filtered !== 'all' && entries.length === 0) continue
    const sectionOpen = !state.collapsed.has(section)
    rows.push({ kind: 'section', key: `section:${section}`, section, label: t('section', { section: heading, count: String(entries.length) }), open: sectionOpen })
    if (!sectionOpen) continue
    for (const entry of entries) {
      const open = isOpen(state, entry.feature, entry.filtered)
      rows.push({ kind: 'feature', key: entry.feature.key, feature: entry.feature, open })
      if (open) rows.push(...childRows(state, entry.feature, entry.filtered, t))
    }
  }
  return rows
}

/** An open Feature's file rows, or the one note that stands in for them. */
function childRows(state: WorkbenchState, feature: RoadmapFeature, filtered: FilteredFeature | undefined, t: Translate): Row[] {
  // `:` keeps the note's key apart from file keys (`<feature>/<path>`) and Feature keys, which end in a number.
  const note = (text: string | undefined): Row[] => [{ kind: 'note', key: `${feature.key}:note`, text }]
  const missing = t('feature.missing', { path: feature.link })
  if (feature.dir.kind === 'outside') return note(missing)
  const dir = feature.dir.path
  const listing = state.files.get(dir)
  if (listing === undefined || listing.kind === 'loading') return note(undefined)
  if (listing.kind === 'missing') return note(missing)
  if (listing.kind === 'failed') return note(t('feature.failed', { reason: listing.reason }))
  const files = filtered?.onlyFiles ?? listing.files
  if (files.length === 0 && !listing.incomplete) return note(t('feature.empty'))
  const rows: Row[] = files.map(path => ({ kind: 'file', key: `${feature.key}/${path}`, dir, path }))
  if (listing.incomplete) rows.push(...note(t('feature.incomplete')))
  return rows
}

/** A failed ROADMAP read's reason in the current language. */
function reasonText(reason: Reason, t: Translate): string {
  return reason.kind === 'too-large' ? t('roadmap.tooLarge') : reason.message
}

/**
 * The workbench page body.
 * @param props - composed slot props.
 * @returns the page.
 */
export function WorkbenchBody(props: WorkbenchBodyProps): ReactNode {
  const { useTabInfo, sessionId, useSessions, t } = props
  const { tab, panel } = useTabInfo()
  const cwd = useSessions(sessions => sessions.byId[sessionId]?.cwd)
  const [state, dispatch] = useReducer(reduce, cwd !== undefined, initialState)
  // Effects read the latest values without re-running when the slot hands over new callbacks.
  const latest = useRef({ state, readRoadmap: props.readRoadmap, listDirectory: props.listDirectory })
  latest.current = { state, readRoadmap: props.readRoadmap, listDirectory: props.listDirectory }
  // Every read records the generation it started in; a refresh, a new working directory, or unmounting
  // moves it on and aborts what is in flight, so a late answer is dropped instead of shown.
  const run = useRef({ generation: 0, controller: new AbortController() })

  const refresh = useCallback((fresh: boolean): void => {
    const current = run.current
    current.controller.abort()
    current.controller = new AbortController()
    const mine = ++current.generation
    const previous = fresh ? { kind: 'loading' as const } : latest.current.state.load
    dispatch({ type: 'start' })
    void load(previous, latest.current.readRoadmap, current.controller.signal).then((next) => {
      if (mine === run.current.generation) dispatch({ type: 'loaded', load: next })
    })
  }, [])

  useEffect(() => {
    dispatch({ type: 'reset', workspace: cwd !== undefined })
    if (cwd !== undefined) refresh(true)
    const current = run.current
    return () => {
      current.generation++
      current.controller.abort()
    }
  }, [cwd, sessionId, refresh])

  useEffect(() => {
    const current = run.current
    const mine = current.generation
    for (const dir of wantedDirs(state)) {
      dispatch({ type: 'files', dir, listing: { kind: 'loading' } })
      void listFeatureFiles(latest.current.listDirectory, dir, current.controller.signal).then((listing) => {
        if (mine === run.current.generation) dispatch({ type: 'files', dir, listing })
      })
    }
  }, [state])

  const index = useRef<TextSearchIndex<SearchItem> | undefined>(undefined)
  const roadmap = state.load.kind === 'ready' ? state.load.roadmap : undefined
  const filtering = state.query.trim() !== ''
  const filtered = useMemo((): FilteredRoadmap | 'all' => {
    if (roadmap === undefined || !filtering) return 'all'
    index.current = buildIndex(roadmap, dir => state.files.get(dir), index.current)
    return filterFeatures(index.current, state.query)
  }, [roadmap, filtering, state.files, state.query])

  const onOpen = useCallback((dir: string, path: string): void => {
    const address = fileAddressFor(sessionId, cwd, `${dir}/${path}`)
    if (panel.isFloating) tab.actions.openResource(address)
    else tab.actions.openResource(address, { paneId: panel.id })
  }, [cwd, sessionId, tab.actions, panel.id, panel.isFloating])

  const busy = state.load.kind === 'loading' || (state.load.kind === 'ready' && state.load.refreshing)
  return (
    <div className={css.page} data-workbench-page>
      <div className={css.header}>
        <h2 className={css.title}>{t('title')}</h2>
        <Tooltip label={t('refresh')} side="bottom" delayMs={500}>
          <button type="button" className={css.tool} aria-label={t('refresh')} data-workbench-refresh
            disabled={busy || cwd === undefined} onClick={() => { refresh(false) }}>
            <IconRefreshOutlineRegular />
          </button>
        </Tooltip>
      </div>
      <Content state={state} filtered={filtered} t={t} dispatch={dispatch} onOpen={onOpen} />
    </div>
  )
}

interface ContentProps {
  readonly state: WorkbenchState
  readonly filtered: FilteredRoadmap | 'all'
  readonly t: Translate
  readonly dispatch: (action: Parameters<typeof reduce>[1]) => void
  readonly onOpen: (dir: string, path: string) => void
}

/** Everything below the header: a state line, or the search box and the tree. */
function Content({ state, filtered, t, dispatch, onOpen }: ContentProps): ReactNode {
  const { load } = state
  switch (load.kind) {
    case 'no-workspace': return <StatusLine state="no-workspace" text={t('state.noWorkspace')} />
    case 'loading': return <div className={css.loading} aria-busy="true" data-workbench-state="loading"><StateDot state="ongoing" /></div>
    case 'uninitialized': return <StatusLine state="uninitialized" text={t('state.uninitialized')} />
    case 'failed': return <StatusLine state="failed" text={t('state.roadmapFailed', { reason: reasonText(load.reason, t) })} />
    case 'ready': break
  }
  const refreshNotice = load.refreshError === undefined
    ? undefined
    : <p className={css.notice} role="status" data-workbench-notice>{t('refresh.failed', { reason: reasonText(load.refreshError, t) })}</p>
  if (allFeatures(load.roadmap).length === 0) {
    return <>{refreshNotice}<StatusLine state="no-features" text={t('state.noFeatures')} /></>
  }
  const rows = rowsOf(state, load.roadmap, filtered, t)
  // While a listing a query needs is on its way, an empty result is not final yet.
  const pending = filtered !== 'all' && allFeatures(load.roadmap).some((feature) => {
    if (feature.dir.kind !== 'inside') return false
    const listing = state.files.get(feature.dir.path)
    return listing === undefined || listing.kind === 'loading'
  })
  return (
    <>
      {refreshNotice}
      <div className={css.searchBar}>
        <Input className={clsx(css.search)} type="search" icon={<IconSearchOutlineRegular />} value={state.query}
          placeholder={t('filter')} aria-label={t('filter')} data-workbench-filter
          onChange={(event) => { dispatch({ type: 'query', query: event.currentTarget.value }) }}
          onKeyDown={(event) => {
            if (event.key !== 'Escape' || state.query === '') return
            event.preventDefault()
            event.stopPropagation()
            dispatch({ type: 'query', query: '' })
          }} />
      </div>
      {rows.length === 0
        ? pending
          ? <div className={css.loading} aria-busy="true" data-workbench-state="filtering"><StateDot state="ongoing" /></div>
          : <StatusLine state="no-match" text={t('filter.noMatch')} />
        : <Tree rows={rows} t={t} dispatch={dispatch} onOpen={onOpen} />}
    </>
  )
}

function StatusLine({ state, text }: { state: string; text: string }): ReactNode {
  return <div className={css.status} data-workbench-state={state}><p className={css.statusLine}>{text}</p></div>
}

interface TreeProps {
  readonly rows: readonly Row[]
  readonly t: Translate
  readonly dispatch: ContentProps['dispatch']
  readonly onOpen: ContentProps['onOpen']
}

/**
 * The rows as one tree with a single tab stop: arrow keys move between rows,
 * Enter or Space toggles a section or Feature, Enter opens a file, and the
 * right and left arrows expand and collapse.
 */
function Tree({ rows, t, dispatch, onOpen }: TreeProps): ReactNode {
  const [active, setActive] = useState<string | undefined>(undefined)
  const elements = useRef(new Map<string, HTMLElement>())
  const focusable: readonly Focusable[] = rows.filter((row): row is Focusable => row.kind !== 'note')
  const current = focusable.some(row => row.key === active) ? active : focusable[0]?.key

  const toggle = (row: Expandable): void => {
    if (row.kind === 'section') dispatch({ type: 'toggle-section', section: row.section })
    else dispatch({ type: 'toggle-feature', key: row.key })
  }
  const activate = (row: Focusable): void => {
    if (row.kind === 'file') onOpen(row.dir, row.path)
    else toggle(row)
  }
  const onKeyDown = (event: KeyboardEvent, row: Focusable): void => {
    const at = focusable.indexOf(row)
    const move = (to: number): void => {
      const target = focusable[to]
      if (target === undefined) return
      setActive(target.key)
      elements.current.get(target.key)?.focus()
    }
    const expandable = row.kind === 'file' ? undefined : row
    switch (event.key) {
      case 'ArrowDown': move(at + 1); break
      case 'ArrowUp': move(at - 1); break
      case 'ArrowRight': if (expandable?.open === false) toggle(expandable); break
      case 'ArrowLeft': if (expandable?.open === true) toggle(expandable); break
      case 'Enter': activate(row); break
      case ' ': if (expandable !== undefined) toggle(expandable); break
      default: return
    }
    event.preventDefault()
  }

  return (
    <div className={css.body} role="tree" aria-label={t('title')} data-workbench-tree>
      {rows.map((row) => {
        if (row.kind === 'note') {
          return (
            <div key={row.key} className={clsx(css.row, css.note)} role="treeitem" aria-level={LEVEL.note} aria-disabled="true"
              aria-busy={row.text === undefined || undefined} data-workbench-row="note">
              {row.text ?? <StateDot state="ongoing" />}
            </div>
          )
        }
        const common = {
          role: 'treeitem',
          'aria-level': LEVEL[row.kind],
          tabIndex: row.key === current ? 0 : -1,
          ref: (element: HTMLElement | null) => {
            if (element === null) elements.current.delete(row.key)
            else elements.current.set(row.key, element)
          },
          onFocus: () => { setActive(row.key) },
          onClick: () => { setActive(row.key); activate(row) },
          onKeyDown: (event: KeyboardEvent) => { onKeyDown(event, row) },
        }
        if (row.kind === 'file') {
          return (
            <div key={row.key} {...common} className={clsx(css.row, css.file)} data-workbench-row="file" data-workbench-path={row.path}>
              <FileTypeIcon kind={classifyFileType(row.path)} size={16} className={css.fileIcon} />
              <PathLabel path={row.path} className={css.path} />
            </div>
          )
        }
        const chevron = row.open
          ? <IconChevronDownOutlineRegular className={css.chevron} />
          : <IconChevronRightOutlineRegular className={css.chevron} />
        if (row.kind === 'section') {
          return (
            <div key={row.key} {...common} aria-expanded={row.open} className={clsx(css.row, css.section)} data-workbench-row="section">
              {chevron}
              <span className={css.label}>{row.label}</span>
            </div>
          )
        }
        const { feature } = row
        return (
          <Tooltip key={row.key} label={feature.title} side="bottom" delayMs={500} onlyWhenClipped portal>
            <div {...common} aria-expanded={row.open} aria-label={[feature.id, feature.title, feature.priority].filter(Boolean).join(' ')}
              className={clsx(css.row, css.feature)} data-workbench-row="feature" data-workbench-feature={feature.id}>
              {chevron}
              <span className={css.id}>{feature.id}</span>
              <span className={css.label}>{feature.title}</span>
              {feature.priority !== undefined && <span className={css.priority}>{feature.priority}</span>}
            </div>
          </Tooltip>
        )
      })}
    </div>
  )
}
