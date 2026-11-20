# 技术方案评审记录：999 SDD 工作台

[返回需求简报](../BRIEF.md) · 评审对象：[技术方案](../design/TECH_DESIGN.md)、[代码设计附录](../design/CODE_DESIGN.md)

| 项 | 值 |
|---|---|
| 评审日期 | 2026-11-20 |
| 评审方 | Claude Code 独立会话（my-review-design；与方案作者同模型，上下文隔离，未参与方案编写） |
| 分诊 | 方案作者会话逐条对照代码核对，见文末“分诊与处理” |
| 决策人 | austin |
| 需求依据 | [PRD](../spec/PRD.md) 当前版本（含 2026-11-20 BR-05 / AC-07 修改） |
| 代码基线 | `feat/sdd-workbench` @ `f524acfb82` |
| 既定前提（不再评议） | 技术方案 1.3 “评审前用户决策”：K1 包位置与私有包、K5 占位图标、子目录失败整个 Feature 显示 COPY-13、超过深度上限不提示、Feature 目录限定在 `mai-specs/` 之下、文案测试直接读取 PRD COPY 表比对 |
| 结论 | **有条件通过**：无 P0；4 项 P1 修订方案后进入实施，其中 F2 需负责人决策 |

## 总体结论与依据

方案方向正确，复杂度与需求匹配：只新增一个纯 Client 实验包，复用右侧栏 tab 注册表、引导页、文档预览和 `workspaceFiles` 接口，不新增 Host 接口和持久化。已删除的 store/face 分层、Host 服务、自定义渲染和文件监听都属于正确的减法。

以下关键假设已对照代码核实成立：

| 假设 | 核实结果 | 证据 |
|---|---|---|
| `read` 可读工作区外路径，`list` 限定在工作区内并跟随目录符号链接 | 成立 | `packages/api/workspace-files/README.zh.md`“寻址与路径”“文件读取与目录检查” |
| 符号链接目录项在 `list` 中报告为目标类型 | 成立，成环风险真实存在，需要深度上限 | `packages/api/workspace-files/src/types.ts:97-106` |
| Remote 调用不抛异常，失败折叠为 `{ ok: false, error }` | 成立 | `packages/typert/protocol/src/types.ts:123-132` |
| 引导页卡片可不带图标，默认画立方体占位 | 成立 | `ui-sidebar-right/src/client/tab-registry.ts:81-82`、`tabs/guide/GuideBody.tsx:71` |
| 引导页点击以 `replaceTab` 打开；页 tab 在分栏内去重；资源 tab 跨分栏聚焦 | 成立，满足 AC-01、AC-04 的“不重复打开” | `tabs/guide/GuideBody.tsx:139`、`ui-sidebar-right/README.zh.md:95` |
| `keepMounted: true` 在切 tab、切会话、停靠时保留正文 | 成立 | `ui-sidebar-right/README.zh.md:112`、`shell/SidebarRight.tsx:208` |
| 文档预览认领任意 session 范围的文件地址 | 成立：`fallback` 档、`dsh-resource://file/[\s\S]+`，PNG/PDF/未知类型都有承接 | `ui-sidebar-documentpreview/src/client/definition.ts:50-52` |
| `fileAddressFor(sessionId, cwd, 相对路径)` 生成 session 地址 | 成立 | `packages/util/workspace-path/src/index.ts:92-99` |
| K2：相对路径 patch 行能被 Client 模块注册表识别 | 很可能成立，T1 仍需验证：注册表按“最近归属的 package manifest”确定浏览器模块 id，相对 source 保留包身份；仓库已有相对路径 patch 行先例 | `docs/subsystems/client-modules.zh.md:94`、`packages/experimental/cua-macos/examples/macos.cordis.yml` |
| 实验包命名与私有登记 | 成立，两张表名与规则一致 | `packages/experimental/AGENTS.md`、`scripts/experimental-package-policy.ts:8,115` |

“有条件通过”的依据：F1 会让 AC-05 在合理的验收操作下失败；F2 与仓库硬规则冲突，需要负责人在 PRD 层面决定；F3 中有方案明确写错的事实，T6 按原方案执行会让门禁失败；F4 中有一项配置能力在当前架构下没有接入通道。这些问题都能在方案内修正，不需要改变整体架构。

## 关键发现

### P1（重要，进入实施前修正）

#### F1 行键用“分区 + 行序号”，刷新后展开状态与文件缓存会错位

- **证据**：TECH_DESIGN 2.1.1“行键”、2.1.2“展开集合按行键保存”；CODE_DESIGN §1 `key: \`${key}:${row}\``；§4 `filesOf(feature.key)` 按同一键读取缓存。
- **触发条件**：AC-05 要求在 ROADMAP 新增一行 Feature 后刷新。当前真实 ROADMAP 中，999 是“规划中”第 0 行。如果验收者把新行插在 999 之前，键 `planned:0` 会指向新 Feature，999 变成 `planned:1`。
- **影响**：
  - 新 Feature 被展开，并显示 999 的旧文件缓存；999 被收起。这违反 AC-05“Feature 999 保持展开”。
  - 过滤时，未展开的 Feature 会用错位的缓存匹配，结果错误。
  - 2.1.2 只重列“当前已展开”的 Feature，未展开 Feature 的旧缓存会一直保留。之后展开或过滤时，看到的是刷新前的磁盘内容，不符合 FR-06“反映磁盘上的最新内容”。
- **最小修正**：
  1. 文件缓存改为按 Feature 目录（`dir.path`）作键。目录相同，文件清单必然相同，重复编号也不受影响。
  2. 展开集合改为按 `分区 + 链接原文 + 同链接出现序号` 作键。这样插入或删除其他行不会让键漂移，重复行仍能区分。
  3. 刷新成功后，清空未展开 Feature 的缓存（已展开的照常重列）。
  4. 单元测试增加一例：在 999 之前插入一行后刷新，断言 999 保持展开、文件清单不串。

#### F2 过滤匹配规则与仓库 Client 搜索规则冲突（需负责人决策）

- **证据**：`packages/AGENTS.md` 要求“User search follows the Client search rule”。`packages/client/AGENTS.md`“Search and filter”规定：名称、标题和可读 id 按子串**或**词首模糊子序列匹配；路径只按连续子串匹配；查询按空格拆分，每个词都要命中；结果按匹配度排序。内存列表的实现是 `dsh-util-text-search` 的 `TextSearchIndex`。PRD BR-06 和 CODE_DESIGN §4 用的是单个整串的不区分大小写子串匹配，并保持 ROADMAP 顺序。技术方案没有识别这条规则。
- **影响**：代码评审会按仓库规则指出偏离。如果在实现阶段才改，会同时牵动 PRD BR-06、AC-09 和过滤测试。
- **可选方案**（本评审不修改 PRD，由负责人选择）：
  - **A（推荐）**：用 `TextSearchIndex` 实现过滤，编号和标题放 `fuzzy`，文件相对路径放 `substring`。AC-09 的 a～d 四种输入结果不变。需要同步修改 PRD BR-06：增加模糊匹配和多词匹配；组内顺序改为按匹配度排序，或明确在分组树中保留 ROADMAP 顺序并说明理由。代价是增加一个现有工具库依赖，`filter.ts` 代码反而会减少。
  - **B**：保留 PRD 的子串规则，在包 README“Known Limitations”或 Agent Note 中写明偏离理由（例如 ROADMAP 编号是短数字，模糊匹配噪声大）。代价是代码评审可能不接受。

#### F3 新包配套门禁与产物缺失，其中一项写错

- **写错的事实**：TECH_DESIGN 2.3.4 写“`zh`、`en` 字典（仓库要求的两个基础语言）”，2.3.1 也只列了 `locale/zh.json`、`locale/en.json`。实际要求是 8 种语言：
  - `scripts/shipped-locales.ts:2` 定义 `SHIPPED_LOCALE_IDS = ['en','zh','ja','es','fr','de','ru','pt']`。
  - `scripts/locale-dictionary-parity.spec.ts:293-300` 要求含 zh/en 的 `ctx.locale.register` 同时注册其余 6 种语言，`:380` 检查其余语言与 en 的键一致。
  - `scripts/verify-locale-metadata.ts:52-57` 要求包的 `locale/` 下 8 个语言文件齐全。
  - 两项都属于 `pnpm run check:i18n`（`scripts/run-gates.ts:407-412`），所以 T6 的验收条件“`check:i18n` 通过”按原方案必然失败。参照包 `client-ui-stats`、`ui-sidebar-files` 都注册了 8 种语言。
- **漏列的配套项**（依据 `packages/client/AGENTS.md`“New plugin package checklist”“Testing and coverage”，以及 `packages/AGENTS.md`）：
  1. 在 `tsconfig.client.json` 的 aggregate `references` 中登记新包（参照包在 `tsconfig.client.json:134`）。不登记的话，typecheck 和 constraints 覆盖不到它。
  2. `packages/*/*/src/**` 受逐文件 100% 覆盖率门禁约束（`vitest.config.ts:265,428-436`），`WorkbenchBody.tsx`、`client/index.ts` 的所有分支都要覆盖。T5 的测试范围需要按此估算。
  3. Tab 类型、正文和字典的注册需要 HMR 处置测试：卸载 fiber 后注册项被移除（“Registry contributions prove disposal”）。
  4. 包 README 需要 Model Experience 章节（参照 `scripts/verify-package-readme-model-experience.ts:85` 中 `client-ui-stats` 的 `none` 条目）和 Known Limitations 章节；还要在 `packages/experimental/README*.md` 的包表中登记（参照第 74 行）。
  5. 如果保留 Host 侧 `Config`，需要重新生成 `docs/config-catalog*.md`（`pnpm run gen-config-catalog`）。按 F4 删除 `Config` 后，这一项也随之消失。
- **最小修正**：2.3.1 文件表和 T6 改为 8 种语言（其余 6 种的 UI 字典和 `meta` 翻译）；T1 增加 `tsconfig.client.json` 登记和 README 包表登记；T5 写明 100% 覆盖率与 HMR 处置测试；T8 列出上述门禁的实际命令。PRD NFR-01 只要求中英文，增加其他语言不与 PRD 冲突。

#### F4 `maxDepth` 作为 patch 行配置到不了 Client 代码，建议改为常量

- **证据**：TECH_DESIGN 2.2 写道“在 patch 行的 `config` 中可改……必须是正整数，否则加载时报错”，并把 `Config` schema 放在 Host 半（2.3.1 `src/index.ts`）。但递归列目录运行在浏览器端。Client 启动图的 `WebBootEntry` 只有 `id/url/rev/inject/immediately/external`，没有 config 字段（`docs/subsystems/client-modules.zh.md:22-38`）。已有带 `Config` 的 Client 插件也是用 `config = Config({})` 默认值兜底（`packages/client/ui-context-menu/src/client/index.ts:55`）。本评审未找到 patch 行 config 传到 Client 半的通道，按现有证据，这项配置能力无法按描述实现。
- **减法推演**：删除这项配置，PRD 的所有 AC 和硬约束仍然满足；1.3 中用户确认的是默认值 8 和超过上限不提示，没有要求可配置。删除后还省掉 Host `Config` schema、配置目录重新生成、README 配置说明和非法值报错测试。
- **最小修正**：`feature-files.ts` 中改用模块常量 `MAX_DEPTH = 8`，Host 半只保留空 `apply()`，删除 2.2 节。同时写明边界语义：CODE_DESIGN §3 的 `depth <= maxDepth` 实际会列出 0～8 共 9 层，要在常量注释和测试中明确“根目录算第 0 层”。

### P2（建议，可在实施中顺带处理）

| 编号 | 问题与证据 | 建议 |
|---|---|---|
| F5 | 正文如何拿到 `read` / `list` 未写明。架构图画的是 `BODY → remote.workspaceFiles`，但 `packages/client/AGENTS.md`“ctx discipline”规定组件不能接触 ctx，远程能力要经 inject face 以回调传入（参照 `ui-sidebar-files` 的 `createList(ctx.remote)` + `inject`） | 2.3.3 写明：`slots.register({ name: 'sidebar.right.pane.tab', key, locale, inject: () => ({ readRoadmap, listDirectory }) }, WorkbenchBody)`。这样 CODE_DESIGN §3/§5 中的 `ListDirectory` / `ReadRoadmap` 就是注入的回调，组件测试也可以直接传桩 |
| F6 | 代次校验只用于 ROADMAP（§5）。展开和过滤预取的 `list` 结果没有代次检查。刷新时 abort 掉的请求会以 `ok:false` 返回（Remote 把载体失败折叠进错误分支），如果写入缓存，该 Feature 会一直显示 COPY-13“已取消”。另外，刷新后有关键词时，没有说明要重新触发预取 | 文件清单请求同样带代次，被取代的结果不写缓存；刷新完成且关键词非空时重新预取；预取未完成时显示加载中，不显示 COPY-12（否则输入 `prd` 时会先闪一下“没有匹配”） |
| F7 | 文案占位符：PRD 中文用 `{原因}`、`{路径}`、`{分区名}`、`{数量}`。locale 插值正则是 `\{(\w+)\}`（`packages/client/locale/src/client/index.ts:476`），不匹配中文名；字典一致性检查也要求各语言占位符相同（`localeTokens`） | 字典统一用 `{reason}`、`{path}`、`{section}`、`{count}`。PRD 比对测试（既定前提）内置中文占位名到英文占位名的映射后再逐字比较 |
| F8 | `resolveFeatureDir` 没有处理百分号编码、尖括号链接 `<a b/BRIEF.md>` 和 `?` 查询串。目录名含空格或中文、被编码时会被误判为目录缺失（COPY-09） | 先剥离 `<>`、截掉 `?`/`#`，再 `decodeURIComponent`（解码失败按无效行处理），然后归一化。在 §2 示例表补这两例，并补“`mai-specs/a/../../src` 判为 outside”的用例 |
| F9 | `mai-specs` 本身是指向工作区外的符号链接时，`read('mai-specs/ROADMAP.md')` 只拒绝末端符号链接，中间符号链接会被跟随，读到工作区外内容；而 `list` 会以 `outside-workspace` 拒绝，所有 Feature 显示 COPY-09。这与 BR-01“不读取工作目录之外的路径”有一处缺口 | 不需要新增防护（读的是固定文件，Host 的读权限本来就允许）。在 README Known Limitations 写明，并在风险表登记 |
| F10 | 文档一致性：方案头部写“PRD（2026-11-19 评审后版本）”，实际已依据 2026-11-20 版本；任务表没有任务覆盖 AC-01 的“组件测试覆盖注册” | 头部改为 2026-11-20；把 AC-01 注册测试并入 T5（可与 F3 的 HMR 处置测试合并） |
| F11 | 过滤中自动展开的 Feature，用户点击它时如何表现没有定义。AC-09(d) 要求清空后恢复原展开状态 | 写明过滤态下的展开和收起不写回原展开集合，或过滤时不响应收起，二选一后写入 2.3.3 |

## 待验证事项

| 事项 | 验证方式 | 负责 |
|---|---|---|
| K2 相对路径 patch 行加载 Client 包，以及 `name` 写 `./` 还是 `./src/index.ts` | T1 按方案执行；证据见上表，预计成立 | 实施者 |
| F4 的结论：Client 半确实拿不到 patch 行 config | 删除 Config 后此项不再需要验证；如果坚持保留，T1 中先确认 `apply(ctx, config)` 能收到值 | 实施者 |
| `packages/AGENTS.md`“Product-visible plugins require a non-unit REAL-composition test”是否适用于默认不加载的私有实验包 | 实施前对照 `docs/testing.md` 确认；适用时，最小做法是用测试专用 `cordis.yml` 加 patch 启动一次，断言 tab 类型已注册 | 实施者，必要时请负责人确认 |

## 本次必须补齐 / 可删减 / 保持现状

- **必须补齐（修订方案后实施）**：F1 键与缓存修正；F2 负责人决策并同步 PRD BR-06；F3 的 8 种语言、aggregate 登记、100% 覆盖率、HMR 处置测试、README 与包表登记；F4 删除 `Config` 改为常量。
- **可以删除**：Host 侧 `Config` schema 与 2.2 节（F4）。
- **保持现状**：K1、K5（既定前提）；K2 加 T1 先行验证；K3 用 `useReducer` 加 `keepMounted`，不引入 store；K6 分页读取；越界“插件判断 + Host 拒绝”双重保护；复用文档预览，不自绘渲染。
- **业务测试**：AC-01、AC-03～AC-05、AC-09 都含人工步骤（录屏、真实 ROADMAP 核对、磁盘改动后刷新），目前还没有测试计划。建议编排者在实施后安排 `my-create-test-plan` 整理验收场景，其中 AC-05 要包含 F1 的“插在 999 之前”的情形。本评审不派发。

## 复评记录

| 日期 | 结果 |
|---|---|
| 2026-11-20 | 首次评审：有条件通过，待处理 F1～F4 |
| 2026-11-20 | 方案作者按下表修订 F1～F11，未再发起复评；修订内容由代码评审阶段一并核对 |

## 分诊与处理

方案作者逐条核对评审证据后处理。核对方式：P1 全部打开评审引用的文件核对原文；P2 按方案与附录推演，F5、F7 另外核对了引用文件。

| 编号 | 核对结果 | 分级 | 处理 |
|---|---|---|---|
| F1 | 属实：附录按行序号作键，插入行后键漂移 | 必须改 | 行键改为“分区 + 链接原文 + 出现序号”，缓存按 Feature 目录作键；刷新成功清空缓存；T2、T5 增加“在 999 前插入一行”的测试 |
| F2 | 属实：`packages/client/AGENTS.md:126-136` | 需决策 | 负责人选择 A：用 `TextSearchIndex`（新增决策 K7），同步 PRD BR-06 |
| F3 | 属实：`scripts/shipped-locales.ts:2`、`tsconfig.client.json:134`、`vitest.config.ts:428-436`；方案“两个基础语言”为作者事实错误 | 必须改 | 语言改为 8 种（其余 6 种 AI 翻译，PRD NFR-01 注明不在验收范围）；T1 增加 tsconfig 与实验包表登记；T5 写明 100% 覆盖率与 HMR 处置测试；T7 写明 README 必填章节 |
| F4 | 属实：`WebBootEntry` 无 config 字段 | 必须改 | 删除 `Config` 与 2.2 节，改为常量 `MAX_DEPTH = 8`，注明根目录为第 0 层 |
| F5 | 属实：`packages/client/AGENTS.md:42-44` | 值得改 | 读取能力经 inject 回调传入，架构图同步 |
| F6 | 属实 | 值得改 | 文件清单请求带代次；刷新后关键词非空时重新预取；预取未完成时显示加载中而非 COPY-12 |
| F7 | 属实：`locale/src/client/index.ts:476` 的 `\w` 不匹配中文 | 值得改 | PRD COPY 表占位符改用英文名，界面显示不变；文案比对测试逐字比较 |
| F8 | 属实 | 值得改 | 处理尖括号、查询串和百分号解码，附录 §2 示例表补充用例 |
| F9 | 属实 | 值得改 | 登记风险表，README Known Limitations 写明，不新增防护 |
| F10 | 属实 | 值得改 | 方案头部改为 2026-11-20 版本；AC-01 注册测试并入 T5 |
| F11 | 属实 | 值得改 | 作者选定：过滤视图中的展开/收起只作用于过滤视图，不写回原展开集合 |
| 待验证：真实组合测试 | 未核对适用性 | 转交实施 | T8 先对照 `docs/testing.md:39` 确认，适用则补 |

| 分级 | 数量 |
|---|---|
| 必须改 | 3（F1、F3、F4） |
| 需决策 | 1（F2，已决定） |
| 值得改 | 7（F5～F11） |
| 不改 | 0 |
| 合计 | 11 |
