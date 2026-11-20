/**
 * Browser half: register `sdd-workbench` as a right-Sidebar page type with a
 * guide entry, its body under the type's id, and its dictionaries.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { WORKBENCH_ID, workbenchDefinition } from './definition.ts'
import { NS, de, en, es, fr, ja, pt, ru, zh } from './locales.ts'
import { WorkbenchBody } from './WorkbenchBody.tsx'

export type { SddWorkbenchKey } from './locales.ts'
export type { WorkbenchBodyProps } from './WorkbenchBody.tsx'

/** Required browser services: the slot table, copy, and the right-Sidebar tab registry. */
export const inject = ['slots', 'locale', 'sidebarRightTabs']

/**
 * Client plugin body.
 * @param ctx - client root context carrying the registry, the slots, and copy.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en, ja, es, fr, de, ru, pt }), 'sdd-workbench: dictionaries')
  ctx.effect(() => ctx.sidebarRightTabs.register(workbenchDefinition(t)), 'sdd-workbench: tab type')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab', key: WORKBENCH_ID, locale: NS },
    WorkbenchBody,
  )), 'sdd-workbench: page body')
}
