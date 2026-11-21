# 代码设计附录：SDD 工作台

[返回技术方案](TECH_DESIGN.md)

> 以下是**设计示意**，供评审，未编译、未运行、未测试。拟新增文件均位于 `packages/experimental/sdd-workbench/`。外围样板（imports、JSDoc、样式）省略。2026-11-20 按[方案评审](../review/design_review.md) F1～F11 修订。

## 1. ROADMAP 解析（`roadmap.ts`）

对应 BR-02、BR-05、AC-02、AC-05。

```ts
/** ROADMAP 的三个二级标题，按显示顺序排列（BR-02：进行中、规划中、已完成）。 */
export const SECTIONS = [
  { key: 'in-progress', heading: '进行中' },
  { key: 'planned', heading: '规划中' },
  { key: 'done', heading: '已完成' },
] as const
export type SectionKey = typeof SECTIONS[number]['key']

export type FeatureDir =
  | { readonly kind: 'inside'; readonly path: string } // mai-specs/ 之下的工作区相对路径，如 'mai-specs/999-sdd-workbench'
  | { readonly kind: 'outside' }

export interface RoadmapFeature {
  /** 行键：`${section}:${link}:${同分区同链接的出现序号}`。插入或删除其他行不会改变它。 */
  readonly key: string
  readonly section: SectionKey
  readonly id: string
  readonly title: string
  /** 空单元格为 undefined，界面不显示（UI-01）。 */
  readonly priority: string | undefined
  /** 标题列链接原文，用于 COPY-09 的 {path}。 */
  readonly link: string
  readonly dir: FeatureDir
}

export type Roadmap = Readonly<Record<SectionKey, readonly RoadmapFeature[]>>

export function parseRoadmap(markdown: string): Roadmap {
  const result: Record<SectionKey, RoadmapFeature[]> = { 'in-progress': [], planned: [], done: [] }
  for (const { key: section, heading } of SECTIONS) {
    const body = sectionBody(markdown, heading)   // 该 `## heading` 到下一个 `## ` 之间的文本；缺失 → undefined
    if (body === undefined) continue               // 缺失分区视为空（UI-01）
    const table = firstTable(body)                 // 第一组连续的 `|` 行：表头、分隔行、数据行；没有 → undefined
    if (table === undefined) continue
    const col = columnIndex(table.header)          // 按表头文字找“需求”“标题”“优先级”的列号
    if (col === undefined) continue                // 缺“需求”或“标题”列 → 无法识别，视为空分区
    const seen = new Map<string, number>()         // 链接原文 → 已出现次数，区分重复行
    for (const cells of table.rows) {
      const row = parseRow(cells, col)
      if (row === undefined) continue              // 无效行跳过（BR-05）
      const n = seen.get(row.link) ?? 0
      seen.set(row.link, n + 1)
      result[section].push({ ...row, section, key: `${section}:${row.link}:${n}` })
    }
  }
  return result
}

function parseRow(cells: readonly string[], col: Columns): Omit<RoadmapFeature, 'key' | 'section'> | undefined {
  const id = cells[col.id]?.trim()
  const link = firstMarkdownLink(cells[col.title] ?? '')   // `[text](target)` → { text, target }
  if (!id || link === undefined || !link.text.trim()) return undefined
  const dir = resolveFeatureDir(link.target)
  if (dir === undefined) return undefined                   // URL / 绝对路径 / 锚点 / 无法解码 → 无效行（BR-05）
  const priority = col.priority === undefined ? undefined : cells[col.priority]?.trim() || undefined
  return { id, title: link.text.trim(), priority, link: link.target, dir }
}
```

**审查问题**

- 表格单元格按未转义的 `|` 切分；标题中含转义 `\|` 时需保留。my-ai-infra 生成的 ROADMAP 不含此情况，单元测试覆盖一例即可。
- 分区标题按 `## ` 后的文字**精确匹配**（去首尾空格）。写法不同（如“进行中（2）”）视为缺失分区。这是 PRD“无法识别的结构视为空分区”的直接实现。
- 行键用链接原文而不是行序号（评审 F1）：AC-05 在 999 之前插入新行时，999 的键不变，展开状态保留。同一行把链接改成别的写法会被视为新行，展开状态丢失，这是可接受的。

## 2. Feature 目录解析与越界判断

对应 BR-01、BR-05、AC-07。

```ts
const SCHEME = /^[a-z][a-z0-9+.-]*:/i

/**
 * @returns undefined：不是可用的相对路径链接（行无效）；outside：不在 mai-specs/ 之下；inside：mai-specs/ 下的工作区相对目录。
 */
export function resolveFeatureDir(target: string): FeatureDir | undefined {
  let t = target.trim()
  if (t.startsWith('<') && t.endsWith('>')) t = t.slice(1, -1)          // CommonMark 尖括号链接 `<a b/BRIEF.md>`
  if (t === '' || t.startsWith('#') || t.startsWith('/') || t.startsWith('\\') || SCHEME.test(t)) return undefined
  const raw = t.split(/[?#]/)[0]                                         // 去掉查询串与锚点
  let decoded: string
  try { decoded = decodeURIComponent(raw) } catch { return undefined }   // `%E4%BD` 等非法编码 → 无效行
  // 以 mai-specs/ 为基准做 POSIX 归一化：处理 '.'、'..'、重复斜杠、反斜杠。
  const file = posixNormalize(`mai-specs/${decoded.replace(/\\/g, '/')}`)
  const parent = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : ''
  // 前缀判断必须在归一化之后：'..' 开头（工作区外）、'src'（工作区内其他目录）、'mai-specs' 本身都不是 Feature 目录。
  if (!parent.startsWith('mai-specs/')) return { kind: 'outside' }
  return { kind: 'inside', path: parent }
}
```

示例：

| 链接原文 | 结果 |
|---|---|
| `999-sdd-workbench/BRIEF.md` | inside `mai-specs/999-sdd-workbench` |
| `./999-x/BRIEF.md#背景` | inside `mai-specs/999-x` |
| `998-%E6%90%9C%E7%B4%A2/BRIEF.md` | inside `mai-specs/998-搜索` |
| `<997 a b/BRIEF.md>` | inside `mai-specs/997 a b` |
| `../../outside/BRIEF.md` | outside（工作区外） |
| `../src/x.md` | outside（工作区内，但不在 `mai-specs/` 之下） |
| `999-x/../../src/x.md` | outside（归一化为 `src/x.md`） |
| `ROADMAP.md` | outside（父目录是 `mai-specs` 本身） |
| `https://example.com/a.md`、`/abs/BRIEF.md`、`#top`、`%E4%BD/BRIEF.md` | undefined（行无效） |

**审查问题**：`posixNormalize` 自写还是复用 `node:path/posix`（浏览器包中不可用）——实施时在仓库内查找已有的浏览器端路径工具，没有再自写，并以上表作为单元测试。

## 3. 递归列文件（`feature-files.ts`）

对应 BR-03、AC-03、AC-06（d）（f）。

```ts
/** 根目录为第 0 层，最多列到第 8 层。防止工作区内符号链接成环（K4）。 */
export const MAX_DEPTH = 8

export type FileListing =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ok'; readonly files: readonly string[] }   // 相对 Feature 目录的路径
  | { readonly kind: 'missing' }                                 // COPY-09
  | { readonly kind: 'failed'; readonly reason: string }         // COPY-13

/** 由 client/index.ts 闭包 ctx.remote.workspaceFiles.list 后注入（评审 F5）。 */
export type ListDirectory = (path: string, signal: AbortSignal) =>
  Promise<{ ok: true; entries: readonly WorkspaceDirectoryEntry[] } | { ok: false; code: string; message: string }>

export async function listFeatureFiles(list: ListDirectory, dir: string, signal: AbortSignal): Promise<FileListing> {
  const files: string[] = []
  let level: string[] = ['']                                     // 相对 dir 的待列目录
  for (let depth = 0; level.length > 0 && depth <= MAX_DEPTH; depth++) {
    const next: string[] = []
    for (const rel of level) {
      const answer = await list(rel === '' ? dir : `${dir}/${rel}`, signal)
      if (!answer.ok) {
        const rootMissing = rel === '' && (answer.code === 'workspace-file/not-found' || answer.code === 'workspace-file/outside-workspace')
        return rootMissing ? { kind: 'missing' } : { kind: 'failed', reason: answer.message }
      }
      for (const entry of answer.entries) {
        if (entry.name.startsWith('.')) continue                 // 隐藏文件不列出（BR-03）
        const path = rel === '' ? entry.name : `${rel}/${entry.name}`
        if (entry.type === 'directory') next.push(path)
        else files.push(path)                                    // 'file' 与 'other' 都列出，由预览决定能否打开
      }
    }
    level = next
  }
  return { kind: 'ok', files: sortFiles(files) }
}

/** BRIEF.md 置顶，其余按 Unicode 码点序（确定性，不受界面语言影响；与 JS 的 `<` 按 UTF-16 码元比较不同，含表情等字符时结果有别）。 */
export function sortFiles(files: readonly string[]): string[] {
  return [...files].sort((a, b) => a === 'BRIEF.md' ? -1 : b === 'BRIEF.md' ? 1 : compareCodePoints(a, b))   // 逐个码点比较
}
```

**审查问题**

- 超过 `MAX_DEPTH` 的目录**静默**不再展开，不提示（用户已确认 2026-11-20）。
- 子目录列举失败时，整个 Feature 记为 `failed`，而不是部分展示（用户已确认 2026-11-20）。取舍理由：部分结果会让用户误以为文件不存在。
- `list` 返回 `truncated: true`（单目录超过 2000 项）时不提示。规格目录不会达到此规模。
- 被取消的请求同样返回 `ok: false`；调用方按代次丢弃，不写入缓存（见 §5）。

## 4. 过滤（`filter.ts`）

对应 BR-06、AC-09。实现遵循仓库 Client 搜索规则，复用 `@deepseek-ai/dsh-util-text-search`（K7）。

```ts
/** 每个 Feature 一项（path 为 undefined），每个已列出的文件一项；文件项也带所属 Feature 的编号和标题，让 `999 prd` 这类多词查询能命中。 */
interface Item { readonly feature: RoadmapFeature; readonly path: string | undefined }

const keys = (item: Item): SearchKeys => ({
  fuzzy: [item.feature.id, item.feature.title],                  // 编号、标题：子串或词首模糊匹配
  substring: item.path === undefined ? [] : [item.path],         // 路径：只按连续子串匹配
})

export type FilesOf = (dir: string) => FileListing | undefined

export function buildIndex(roadmap: Roadmap, filesOf: FilesOf): TextSearchIndex<Item> {
  const items: Item[] = []
  for (const { key } of SECTIONS) {
    for (const feature of roadmap[key]) {
      items.push({ feature, path: undefined })
      const listing = feature.dir.kind === 'inside' ? filesOf(feature.dir.path) : undefined
      if (listing?.kind === 'ok') for (const path of listing.files) items.push({ feature, path })
    }
  }
  return new TextSearchIndex(items, keys)
}

export interface FilteredFeature {
  readonly feature: RoadmapFeature
  /** undefined：编号或标题命中，展开时显示全部文件；数组：仅文件命中，强制展开且只显示这些。 */
  readonly onlyFiles: readonly string[] | undefined
}

export function filterFeatures(
  index: TextSearchIndex<Item>, filesOf: FilesOf, query: string,
): Readonly<Record<SectionKey, readonly FilteredFeature[]>> | 'all' {
  if (query.trim() === '') return 'all'                          // 空关键词：完整列表与原展开状态
  const whole = new Set<string>()                                // Feature 项命中的行键
  const hits = new Map<string, Set<string>>()                    // 行键 → 命中的文件
  const order: RoadmapFeature[] = []                             // 首次出现顺序 = 匹配度顺序（同分保持 ROADMAP 顺序）
  for (const { feature, path } of index.search(query)) {
    if (!whole.has(feature.key) && !hits.has(feature.key)) order.push(feature)
    if (path === undefined) whole.add(feature.key)
    else (hits.get(feature.key) ?? hits.set(feature.key, new Set()).get(feature.key)!).add(path)
  }
  const out = { 'in-progress': [], planned: [], done: [] } as Record<SectionKey, FilteredFeature[]>
  for (const feature of order) {
    if (whole.has(feature.key)) { out[feature.section].push({ feature, onlyFiles: undefined }); continue }
    const listing = feature.dir.kind === 'inside' ? filesOf(feature.dir.path) : undefined
    const matched = hits.get(feature.key)!
    // 文件按清单原顺序（BRIEF.md 置顶）显示，不按匹配度
    const onlyFiles = listing?.kind === 'ok' ? listing.files.filter(f => matched.has(f)) : []
    out[feature.section].push({ feature, onlyFiles })
  }
  return out
}
```

页面渲染时隐藏 `out[key]` 为空的分组，组标题数量取 `out[key].length`（BR-06）。分组顺序固定为 `SECTIONS`，组内按匹配度排序。尚未取得文件清单的 Feature 只有 Feature 项参与匹配；清单到达后 `useMemo` 重建索引（`index.update`）。

**审查问题**

- AC-09 四种输入在新规则下的结果：（a）`999` 命中编号 → 只显示 999；（b）`prd`/`PRD` 不命中标题（无以 p 开头的词），命中文件 `spec/PRD.md` → 999 自动展开只列该文件；（c）无命中 → COPY-12；（d）返回 `'all'`。实施时以真实 ROADMAP 再确认（b），若某标题恰好词首模糊命中 `prd`，该 Feature 会整行显示，这符合 BR-06 新写法。
- Feature 项命中时，同一 Feature 的文件项必然也命中（共享 `fuzzy` 键），由 `whole` 优先保证显示全部文件。

## 5. 页面状态与刷新（`WorkbenchBody.tsx`）

对应 FR-06、UI-01 状态表、AC-05、AC-06（e）（g）。

```ts
type Load =
  | { readonly kind: 'no-workspace' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'uninitialized' }
  | { readonly kind: 'failed'; readonly reason: string }
  | { readonly kind: 'ready'; readonly roadmap: Roadmap; readonly refreshing: boolean; readonly refreshError: string | undefined }

/** 一次加载或刷新；读取失败时，已有列表保留并附带 refreshError。 */
async function load(prev: Load, read: ReadRoadmap, signal: AbortSignal): Promise<Load> {
  const answer = await read(signal)                              // 分页读到 eof 并拼接；read 为注入的回调
  if (answer.ok) return { kind: 'ready', roadmap: parseRoadmap(answer.text), refreshing: false, refreshError: undefined }
  if (prev.kind === 'ready') return { ...prev, refreshing: false, refreshError: answer.message } // 保留旧列表（D1）
  return answer.code === 'workspace-file/not-found' ? { kind: 'uninitialized' } : { kind: 'failed', reason: answer.message }
}
```

```ts
// 组件内（示意）。readRoadmap、listDirectory 来自 inject 回调。
const generation = useRef(0)

const refresh = useCallback(() => {
  const mine = ++generation.current
  controller.current?.abort(); controller.current = new AbortController()
  dispatch({ type: 'start' })                                   // ready → refreshing=true；其他 → loading
  void load(stateRef.current.load, readRoadmap, controller.current.signal).then((next) => {
    if (mine !== generation.current) return                      // 被更新的刷新取代
    dispatch({ type: 'loaded', load: next })
    if (next.kind !== 'ready' || next.refreshError !== undefined) return // 失败：缓存不动
    dispatch({ type: 'clear-cache' })                            // 评审 F1：未展开 Feature 的旧清单一并清除
    for (const dir of expandedDirs(next.roadmap, stateRef.current.expanded)) fetchFiles(dir)
    if (stateRef.current.query.trim() !== '') for (const dir of insideDirs(next.roadmap)) fetchFiles(dir) // 评审 F6
  })
}, [/* … */])

/** 列一个目录并写缓存；代次已变时丢弃结果（评审 F6）。同一目录已有 loading/ok 时不重复请求。 */
const fetchFiles = (dir: string) => {
  const mine = generation.current
  if (stateRef.current.files.has(dir)) return
  dispatch({ type: 'files', dir, listing: { kind: 'loading' } })
  void listFeatureFiles(listDirectory, dir, controller.current!.signal).then((listing) => {
    if (mine !== generation.current) return                      // 被刷新取代或已卸载，不写缓存
    dispatch({ type: 'files', dir, listing })
  })
}
```

过滤状态下的展开（评审 F11）：

```ts
// expanded：用户在无关键词时的展开集合（行键），过滤期间只读。
// filterToggled：过滤视图中用户点过的行键，关键词清空时清空。
const defaultOpen = (f: FilteredFeature) =>
  f.onlyFiles !== undefined || state.expanded.has(f.feature.key)            // 文件命中自动展开；编号/标题命中沿用原状态
const isOpen = (f: FilteredFeature) => query === ''
  ? state.expanded.has(f.feature.key)
  : defaultOpen(f) !== state.filterToggled.has(f.feature.key)               // 点一次翻转一次
// 关键词清空 → filterToggled 清空，回到 expanded（AC-09（d））
```

**审查问题**

- `useReducer` 的状态是否需要跨会话保留？`keepMounted: true` 只在同一会话内保留；切换会话后回来同样保留（右侧栏按会话持有正文）。不额外持久化。
- `cwd` 变化（会话工作目录被修改）时递增代次、`abort`，清空展开集合与缓存后重新 `refresh`。
- 文件命中的 Feature 在过滤视图中默认展开，编号或标题命中的沿用过滤前的展开状态。这与 BR-06“仅文件匹配时自动展开”一致。
