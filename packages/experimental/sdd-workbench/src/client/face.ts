/**
 * The page's injected reads, bound to one Session's Workspace. The body never
 * sees the Remote; it receives these two callbacks.
 */
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ListDirectory } from './feature-files.ts'

/** The ROADMAP path the workbench reads, relative to the Session's Workspace. */
export const ROADMAP_PATH = 'mai-specs/ROADMAP.md'

/** The whole ROADMAP, or the Host's failure. */
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
  readonly workspaceFiles: Pick<ClientRemote['workspaceFiles'], 'read' | 'list'>
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
      const pages: string[] = []
      // `read` returns at most its configured line count per page; follow it to the last line.
      for (let offset = 1; ; ) {
        const result = await remote.workspaceFiles.read(sessionId, ROADMAP_PATH, { offset }, signal)
        if (!result.ok) return { ok: false, code: result.error.code, message: result.error.message }
        if (result.value.lines > 0) pages.push(result.value.text)
        if (result.value.eof || result.value.lines === 0) return { ok: true, text: pages.join('\n') }
        offset += result.value.lines
      }
    },
    listDirectory: async (path, signal) => {
      const result = await remote.workspaceFiles.list(sessionId, path, signal)
      if (!result.ok) return { ok: false, code: result.error.code, message: result.error.message }
      return { ok: true, entries: result.value.entries }
    },
  }
}
