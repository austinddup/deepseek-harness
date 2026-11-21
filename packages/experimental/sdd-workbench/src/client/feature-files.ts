/** List every file below a Feature directory, in the order the workbench shows them. */
import type { WorkspaceDirectoryEntry } from '@deepseek-ai/dsh-api-workspace-files/types'

/**
 * The deepest directory level listed; the Feature directory is level 0. A cycle
 * of in-Workspace symlinks would otherwise recurse forever. Deeper directories
 * are left out without notice.
 */
export const MAX_DEPTH = 8

/** One Feature's file list as the page holds it. */
export type FileListing =
  | { readonly kind: 'loading' }
  /** Paths relative to the Feature directory, already sorted. */
  | { readonly kind: 'ok'; readonly files: readonly string[] }
  /** The Feature directory itself is absent or outside the Workspace. */
  | { readonly kind: 'missing' }
  /** Some directory could not be listed; `reason` is the Host's message. */
  | { readonly kind: 'failed'; readonly reason: string }

/** One `list` answer, with a Host failure turned into a value by the caller that owns the remote. */
export type ListResult =
  | { readonly ok: true; readonly entries: readonly WorkspaceDirectoryEntry[] }
  | { readonly ok: false; readonly code: string; readonly message: string }

/** Lists one Workspace-relative directory. */
export type ListDirectory = (path: string, signal: AbortSignal) => Promise<ListResult>

const MISSING_CODES: ReadonlySet<string> = new Set(['workspace-file/not-found', 'workspace-file/outside-workspace'])

/**
 * List a Feature directory level by level, down to {@link MAX_DEPTH}. Entries
 * whose names start with `.` are skipped together with everything below them.
 * Any failure below the Feature directory fails the whole listing, so a partial
 * list never suggests that a file does not exist.
 * @param list - lists one directory.
 * @param dir - the Feature directory, relative to the Workspace.
 * @param signal - cancels the outstanding request.
 * @returns the sorted files, `missing` when the Feature directory is absent or
 * outside the Workspace, or `failed` with the Host's message.
 */
export async function listFeatureFiles(list: ListDirectory, dir: string, signal: AbortSignal): Promise<FileListing> {
  const files: string[] = []
  let level = ['']
  for (let depth = 0; level.length > 0 && depth <= MAX_DEPTH; depth++) {
    const next: string[] = []
    for (const rel of level) {
      const answer = await list(rel === '' ? dir : `${dir}/${rel}`, signal)
      if (!answer.ok) {
        return rel === '' && MISSING_CODES.has(answer.code) ? { kind: 'missing' } : { kind: 'failed', reason: answer.message }
      }
      for (const entry of answer.entries) {
        if (entry.name.startsWith('.')) continue
        const path = rel === '' ? entry.name : `${rel}/${entry.name}`
        // `file` and `other` are both listed; the preview decides whether it can open them.
        if (entry.type === 'directory') next.push(path)
        else files.push(path)
      }
    }
    level = next
  }
  return { kind: 'ok', files: sortFiles(files) }
}

/**
 * Put the Feature's `BRIEF.md` first and order the rest by Unicode code point,
 * independent of the interface language.
 * @param files - distinct paths relative to the Feature directory.
 * @returns a sorted copy.
 */
export function sortFiles(files: readonly string[]): string[] {
  return [...files].sort((a, b) => a === 'BRIEF.md' ? -1 : b === 'BRIEF.md' ? 1 : compareCodePoints(a, b))
}

/** Code-point order, which differs from `<` when an astral character meets one in U+E000–U+FFFF. */
function compareCodePoints(a: string, b: string): number {
  const shorter = Math.min(a.length, b.length)
  for (let i = 0; i < shorter; i++) {
    // At the first differing code unit both strings agree on every earlier unit,
    // so `codePointAt` reads a whole character, or two low surrogates after the same high one.
    if (a.charCodeAt(i) !== b.charCodeAt(i)) return Number(a.codePointAt(i)) - Number(b.codePointAt(i))
  }
  return a.length - b.length
}
