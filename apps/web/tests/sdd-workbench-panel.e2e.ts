// Keyless assembled-browser coverage for the opt-in SDD workbench page: the
// experimental client plugin is mounted only by the test overlay, so this Web
// composition is the package's user-visible evidence outside the jsdom lane.
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import { parseEntryYaml } from '@deepseek-ai/cordis-plugin-include'
import {
  assertFixtureInventory, captureStableAria, compareOrRefreshGolden,
  launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./snapshots/sdd-workbench-panel', import.meta.url))
const PAGE_EXPECTED = join(SNAPSHOT_DIR, 'page.expected.md')
const OVERLAY = fileURLToPath(new URL('./sdd-workbench-panel.overlay.yml', import.meta.url))
const INSTALL_ANCHORS = [
  fileURLToPath(new URL('../../../packages/experimental/sdd-workbench/package.json', import.meta.url)),
]
const MODE = webSnapshotMode()

/** Overlay layer entries, for the composition guard below. */
function profileEntries(path: string): unknown[] {
  const parsed = parseEntryYaml(readFileSync(path, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`profile layer at ${path} must be a list`)
  return parsed
}

const HEAD = '| 需求 | 标题 | 规格 | 优先级 | 说明 |\n|---|---|---|---|---|'

/** A small my-ai-infra layout: two Features in progress, one done, and one row pointing outside `mai-specs/`. */
function writeSpecs(workspace: string): void {
  const files: Record<string, string> = {
    'mai-specs/ROADMAP.md': [
      '# ROADMAP', '',
      '## 进行中', HEAD,
      '| 999 | [Workbench page](999-workbench/BRIEF.md) | standard | P1 | |',
      '| 998 | [Search box](998-search/BRIEF.md) | simple | P2 | |',
      '| 997 | [Escapes the folder](../outside/BRIEF.md) | simple | P2 | |', '',
      '## 规划中', HEAD, '',
      '## 已完成', HEAD,
      '| 990 | [First feature](990-first/BRIEF.md) | simple | P1 | |', '',
    ].join('\n'),
    'mai-specs/999-workbench/BRIEF.md': '# Workbench page\n',
    'mai-specs/999-workbench/spec/PRD.md': '# Workbench PRD\n\nThe page lists features.\n',
    'mai-specs/999-workbench/design/TECH_DESIGN.md': '# Design\n',
    'mai-specs/999-workbench/.hidden.md': 'hidden\n',
    'mai-specs/998-search/BRIEF.md': '# Search box\n',
    'mai-specs/990-first/BRIEF.md': '# First feature\n',
  }
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(workspace, path, '..'), { recursive: true })
    writeFileSync(join(workspace, path), text)
  }
}

describe('SDD workbench overlay', () => {
  it('mounts the experimental client plugin over the shipped Web surface', () => {
    expect(profileEntries(OVERLAY)).toEqual([{
      insert: [{ id: 'sdd-workbench', name: '@deepseek-ai/dsh-sdd-workbench' }],
    }])
  })
})

describe('web e2e: SDD workbench', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    if (MODE === 'record') throw new Error('sdd-workbench-panel is a keyless assembled snapshot; use DSH_SNAPSHOT=refresh')
    scaffold = await launchWebScaffold({ extraOverlayPath: OVERLAY, extraInstallAnchors: INSTALL_ANCHORS })
    writeSpecs(join(scaffold.workspaceCwd, 'workspace'))
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    tripwire = watchConsole(page)
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('opens from the guide, lists the ROADMAP by stage, opens a spec, and follows a language switch', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-sdd-workbench-panel'))
    const column = page.locator('[data-rightbar-col]')
    await page.locator('[data-sidebar-right-expand]').click()
    await column.locator('[data-sidebar-right-guide-entry="sdd-workbench"]').click()
    const workbench = column.locator('[data-workbench-page]')
    await workbench.locator('[data-workbench-feature="999"]').waitFor({ timeout: 15_000 })
    // Sections in fixed order with counts; numbers ascending inside a section.
    expect(await workbench.locator('[data-workbench-feature]').evaluateAll(rows => rows.map(row => row.getAttribute('data-workbench-feature'))))
      .toEqual(['997', '998', '999', '990'])

    await workbench.locator('[data-workbench-feature="999"]').click()
    await workbench.locator('[data-workbench-path="spec/PRD.md"]').waitFor({ timeout: 10_000 })
    // The out-of-bounds row says its folder is missing rather than listing anything.
    await workbench.locator('[data-workbench-feature="997"]').click()
    await workbench.getByText('Feature folder ../outside/BRIEF.md not found', { exact: true }).waitFor({ timeout: 10_000 })
    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
    const snapshot = await captureStableAria(page, '[data-workbench-page]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(PAGE_EXPECTED, snapshot, MODE)

    await workbench.locator('[data-workbench-path="spec/PRD.md"]').click()
    await column.locator('[data-dockkit-tab]').filter({ has: page.getByText('PRD.md', { exact: true }) }).waitFor({ timeout: 15_000 })
    await column.getByText('The page lists features.').waitFor({ timeout: 15_000 })

    // A language switch reaches the open page: its chip title, header, and stage names follow; ROADMAP titles do not.
    const chip = column.locator('[data-dockkit-tab]').filter({ has: page.getByText('SDD workbench', { exact: true }) })
    await chip.click()
    await page.getByRole('button', { name: 'Account menu', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Settings', exact: true }).click()
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
    await settings.getByRole('button', { name: 'English', exact: true }).click()
    await page.getByRole('menuitem', { name: '中文', exact: true }).click()
    await page.keyboard.press('Escape')
    await column.locator('[data-dockkit-tab]').filter({ has: page.getByText('SDD 工作台', { exact: true }) }).waitFor({ timeout: 10_000 })
    await workbench.getByRole('heading', { name: 'SDD 工作台', exact: true }).waitFor({ timeout: 10_000 })
    expect(await workbench.locator('[data-workbench-row="section"]').allInnerTexts()).toEqual(['进行中 (3)', '规划中 (0)', '已完成 (1)'])
    expect(await workbench.locator('[data-workbench-feature="999"]').innerText()).toContain('Workbench page')
  }, 90_000)

  it('keeps the fixture inventory closed', async () => {
    await assertFixtureInventory(SNAPSHOT_DIR, ['page.expected.md'])
  })
})
