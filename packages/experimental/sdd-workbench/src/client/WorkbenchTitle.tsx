/**
 * The workbench tab's chip title, read in the current language on every
 * render. The sidebar stores the title captured when the tab opened; without
 * this seat entry the chip keeps that language after a switch.
 */
import type { ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { NS } from './locales.ts'

/** Props of the workbench tab title. */
export type WorkbenchTitleProps = PropsLocale<typeof NS>

/**
 * Render the chip title.
 * @param props - the namespace-bound translate.
 * @returns the page title in the current language.
 */
export function WorkbenchTitle({ t }: WorkbenchTitleProps): ReactNode {
  return t('title')
}
