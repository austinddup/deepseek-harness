/**
 * The page's injected reads, bound to one Session's Workspace. The body never
 * sees the Remote; it receives these two callbacks.
 */
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ListDirectory } from './feature-files.ts'

/** The ROADMAP path the workbench reads, relative to the Session's Workspace. */
export const ROADMAP_PATH = 'mai-specs/ROADMAP.md'

/** More ROADMAP lines than this are refused rather than read. */
export const MAX_ROADMAP_LINES = 20_000

/** A ROADMAP larger than this, as the Host reports it, is refused before its content is read. */
export const MAX_ROADMAP_BYTES = 2 * 1024 * 1024

/** The failure code for a ROADMAP over either limit; the page shows its own text for it, not a Host message. */
export const ROADMAP_TOO_LARGE = 'sdd-workbench/roadmap-too-large'

const TOO_LARGE = { ok: false, code: ROADMAP_TOO_LARGE, message: '' } as const

/** The Host refuses a page whose text exceeds its byte cap with this code. */
const HOST_PAGE_TOO_LARGE = 'workspace-file/too-large'

const oversized = (bytes: number | undefined): boolean => bytes !== undefined && bytes > MAX_ROADMAP_BYTES

/** The whole ROADMAP, or the Host's failure, or {@link ROADMAP_TOO_LARGE}. */
export type RoadmapText =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly code: string; readonly message: string }

/** Reads the whole ROADMAP of the Session's Workspace. */
export type ReadRoadmap = (signal: AbortSignal) => Promise<RoadmapText>

/** What the page body receives from its registration. */
export interface WorkbenchInjected {
  readonly readRoadmap: ReadRoadmap
  readonly listDirectory: ListDirectory
}

/** The slice of the Client Remote face this package calls. */
export type WorkspaceFilesReadRemote = {
  readonly workspaceFiles: Pick<ClientRemote['workspaceFiles'], 'stat' | 'read' | 'list'>
}

/**
 * Bind the two reads to one Session. Only read operations are reachable.
 * @param remote - the Client Remote face carrying the `workspaceFiles` namespace.
 * @param sessionId - the Session whose Workspace root resolves the paths.
 * @returns the page's injected face.
 */
export function workbenchFace(remote: WorkspaceFilesReadRemote, sessionId: SessionId): WorkbenchInjected {
  return {
    readRoadmap: async (signal) => {
      // The size check comes first so an oversized file is refused without reading any of it.
      const stat = await remote.workspaceFiles.stat(sessionId, ROADMAP_PATH, signal)
      if (!stat.ok) return { ok: false, code: stat.error.code, message: stat.error.message }
      if (oversized(stat.value.bytes)) return TOO_LARGE
      const pages: string[] = []
      let total = 0
      // `read` returns at most its configured line count per page; follow it to the last line.
      for (let offset = 1; ; ) {
        const result = await remote.workspaceFiles.read(sessionId, ROADMAP_PATH, { offset }, signal)
        if (!result.ok) {
          if (result.error.code === HOST_PAGE_TOO_LARGE) return TOO_LARGE
          return { ok: false, code: result.error.code, message: result.error.message }
        }
        // The file can grow between requests; the pages read so far are dropped with `pages`.
        total += result.value.lines
        if (oversized(result.value.bytes) || total > MAX_ROADMAP_LINES) return TOO_LARGE
        if (result.value.lines > 0) pages.push(result.value.text)
        if (result.value.eof || result.value.lines === 0) return { ok: true, text: pages.join('\n') }
        offset += result.value.lines
      }
    },
    listDirectory: async (path, signal) => {
      const result = await remote.workspaceFiles.list(sessionId, path, signal)
      if (!result.ok) return { ok: false, code: result.error.code, message: result.error.message }
      return { ok: true, entries: result.value.entries, truncated: result.value.truncated }
    },
  }
}
