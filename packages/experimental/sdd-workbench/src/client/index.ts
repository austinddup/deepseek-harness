/**
 * Browser half: register `sdd-workbench` as a right-Sidebar page type with a
 * guide entry, its body and chip title under the type's id, and its dictionaries.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { WORKBENCH_ID, workbenchDefinition } from './definition.ts'
import { workbenchFace } from './face.ts'
import { NS, de, en, es, fr, ja, pt, ru, zh } from './locales.ts'
import { WorkbenchBody } from './WorkbenchBody.tsx'
import { WorkbenchTitle } from './WorkbenchTitle.tsx'

export type { SddWorkbenchKey } from './locales.ts'
export type { WorkbenchBodyProps } from './WorkbenchBody.tsx'
export type { WorkbenchTitleProps } from './WorkbenchTitle.tsx'
export type { ReadRoadmap, RoadmapText, WorkbenchInjected } from './face.ts'

/** Required browser services: the slot table, copy, the right-Sidebar tab registry, and the Workspace file reads. */
export const inject = ['slots', 'locale', 'sidebarRightTabs', 'remote', 'remote.workspaceFiles']

/**
 * Client plugin body. The page body receives the ROADMAP read and the
 * directory listing bound to its Session, never the Remote itself.
 * @param ctx - client root context carrying the registry, the slots, copy, and the Remote face.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en, ja, es, fr, de, ru, pt }), 'sdd-workbench: dictionaries')
  ctx.effect(() => ctx.sidebarRightTabs.register(workbenchDefinition(t)), 'sdd-workbench: tab type')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab', key: WORKBENCH_ID, locale: NS, inject: sessionId => workbenchFace(ctx.remote, sessionId) },
    WorkbenchBody,
  )), 'sdd-workbench: page body')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab.title', key: WORKBENCH_ID, locale: NS },
    WorkbenchTitle,
  )), 'sdd-workbench: tab title')
}
