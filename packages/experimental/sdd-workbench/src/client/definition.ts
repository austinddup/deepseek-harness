/** What the `sdd-workbench` tab type is: a page opened from the guide, claiming no resource address. */
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'

/** The tab kind this package owns. */
export const WORKBENCH_KIND = 'sdd-workbench'

/** This implementation's identity in the tab system, and the key its body registers under. */
export const WORKBENCH_ID = '@deepseek-ai/dsh-sdd-workbench'

/**
 * The workbench type's registry definition. It keeps its body mounted so the
 * list, expanded rows, and filter survive tab and Session switches. Without an
 * icon the guide draws its cube placeholder.
 * @param t - namespace-bound translate, read fresh on every label call.
 * @returns the definition to register.
 */
export function workbenchDefinition(t: TranslateNS<'sddWorkbench'>): SidebarRightTabDefinition {
  return {
    id: WORKBENCH_ID,
    kind: WORKBENCH_KIND,
    keepMounted: true,
    title: () => t('title'),
    guide: [{
      id: 'workbench',
      order: 100,
      title: () => t('title'),
      description: () => t('guide.description'),
    }],
  }
}
