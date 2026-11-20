/** The workbench page body. */
import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'

/** Props the `sidebar.right.pane.tab` seat passes to this body. */
export type WorkbenchBodyProps = PropsRuntime<'sidebar.right.pane.tab'> & PropsLocale<'sddWorkbench'>

/**
 * Draw the page header.
 * @param props - seat runtime and the namespace-bound translate.
 * @returns the page.
 */
export function WorkbenchBody({ t }: WorkbenchBodyProps): ReactNode {
  return <h2>{t('title')}</h2>
}
