// @vitest-environment jsdom
/** The chip title follows the language: the stored title is the one captured when the tab opened. */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { en, zh } from '../src/client/locales.ts'
import { WorkbenchTitle } from '../src/client/WorkbenchTitle.tsx'

afterEach(() => { cleanup() })

describe('WorkbenchTitle', () => {
  it('renders the title in the current language and follows a switch', () => {
    const view = render(<WorkbenchTitle t={makeTranslate(zh)} />)
    expect(view.container.textContent).toBe('SDD 工作台')
    view.rerender(<WorkbenchTitle t={makeTranslate(en)} />)
    expect(view.container.textContent).toBe('SDD workbench')
  })
})
