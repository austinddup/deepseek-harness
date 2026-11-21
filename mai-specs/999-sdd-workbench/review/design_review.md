# 技术方案评审记录：999 SDD 工作台

[返回需求简报](../BRIEF.md) · 评审对象：[技术方案](../design/TECH_DESIGN.md)、[代码设计附录](../design/CODE_DESIGN.md)

| 项 | 值 |
|---|---|
| 评审日期 | 2026-11-20 |
| 评审方 | Claude Code 独立会话（my-review-design；与方案作者同模型，上下文隔离，未参与方案编写） |
| 分诊 | 方案作者会话逐条对照代码核对，见文末“分诊与处理” |
| 决策人 | austin |
| 需求依据 | [PRD](../spec/PRD.md) 当前版本（含 2026-11-20 BR-05 / AC-07 修改） |
| 代码基线 | `feat/sdd-workbench` 提交「完成 999-sdd-workbench 的 PRD 与 PRD 评审」（2026-11-19） |
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

---

## 2026-11-21 增量评审：K8 读取数量上限

| 项 | 值 |
|---|---|
| 评审日期 | 2026-11-21 |
| 评审方 | Claude Code 独立会话（my-review-design；上下文隔离，未参与 K8 编写） |
| 评审范围 | 仅 2026-11-21 增量：TECH_DESIGN 1.3 K8 行、2.1.3 接口表、2.3.2 末条、2.3.3“不完整清单与超限原因”、第 3 节与上限有关的风险行、第 5 节 T6b；CODE_DESIGN §6（6.1～6.3）与 §3 末尾划线说明。其余内容已在 2026-11-20 评审，不再评议 |
| 需求依据 | PRD 2026-11-21 版：BR-07、NFR-04、AC-10、COPY-08/14/15/16、UI-01 状态表中引用 BR-07 的行、待确认事项与变更记录中 2026-11-21 的行 |
| 代码基线 | 工作区当前状态（`feat/sdd-workbench`，最近提交「新增 SDD 工作台中英文案与 PRD 文案表的逐字比对测试（T6）」），K8 尚未实现 |
| 既定前提（不再评议） | 用户已确认的数值（2 万行、2 MB、2000 个条目）、ROADMAP 超限整页失败并丢弃已读内容（方案 A）、COPY-15/16 文字、超过深度上限静默不提示、子目录失败整个 Feature 记为 `failed` |
| 结论 | **有条件通过**：无 P0；1 项 P1（G1）需负责人对 PRD 措辞做选择，其余 P2 可直接在方案或 PRD 中修正后进入 T6b |

### 总体结论与依据

K8 的方向和复杂度合适：只用三个模块常量和一个联合类型字段，不新增 Host 接口，也不新增配置，与 K4 的取舍一致。ROADMAP 的行数和字节判定、Feature 条目计数、请求次数上限，都已对照 Host 源码逐项推演，结论成立。与既有行为的衔接也正确：刷新失败保留旧列表与文件缓存，代次与取消机制原样适用，失败优先于不完整，深度上限仍静默。

唯一需要决策的问题在 PRD 与方案之间：“恰好 2000 个条目”是否算不完整。PRD 原文是“达到上限”即标记，方案按“遇到第 2001 个”才标记，AC-10（d）的措辞也与方案行为不一致（G1）。其余发现是事实表述错误、理由需要补全和文档同步，不影响架构。

已核实的关键假设：

| 假设 | 核实结果 | 证据 |
|---|---|---|
| `stat` 与 `read` 都报告整个文件的 `bytes` | 成立，backend 报告大小时才有；本地后端会报告 | `packages/api/workspace-files/src/types.ts:36-37,52`；`src/index.ts:495-501`（`statOf`）；`packages/fs/fs-local/src/index.ts:177,187` |
| `stat` 接受相对路径 `mai-specs/ROADMAP.md`，失败码与 `read` 一致 | 成立：两者都走 `locateFile`，以工作区根为 cwd 解析 | `src/index.ts:241,299-307,467-490`；`README.md:41` |
| `read` 每页受行数限制 | 成立：`limit` 默认且最大为 `maxLines`（默认 5000），超过即 `gateway/bad-request` | `src/index.ts:195,417-421`；`README.md:45,76` |
| `read` 每页**也受字节限制** | 成立：页内容超过 `maxBytes`（默认 2 MiB）即失败 `workspace-file/too-large`，不会返回超大页。TECH_DESIGN 风险表第 221 行的说法与此相反，见 G2 | `src/index.ts:111-137,193`；`README.md:74,160` |
| 行数语义：末尾 `\n` 不另起一行；越过末行返回 `lines: 0, eof: true` | 成立，恰好 20000 行的文件第 4 页（每页 5000 行）`eof` 为真，不判超限 | `src/types.ts:40-65`；`README.md:45` |
| `list` 的 `truncated` 表示 Host 条目上限截掉了子项；上限默认 2000，**计入隐藏项** | 成立：先 `slice(0, maxEntries)` 后由插件过滤隐藏项，所以截断可能丢掉可见项，标记为不完整是对的 | `src/index.ts:196,337-341`；`src/types.ts:119-125` |
| 每个 Feature 最多 1 + 2000 次 `list` | 成立：根目录之外，每次 `list` 对应一个已计数的目录条目；第 8 层的目录计数但不列出；达到上限后不再列同层其余目录，也不进入下一层 | CODE_DESIGN §6.2 第 375-393 行 |
| 现有 `face.ts` 只取 `read`、`list` | 属实，T6b 需把 `stat` 加入 `WorkspaceFilesReadRemote` 的 `Pick` 与测试替身；方案文件清单已列 `face.ts` | `packages/experimental/sdd-workbench/src/client/face.ts:27-29` |
| 刷新失败保留旧列表和文件缓存；成功才清空缓存 | 成立，超限沿用同一路径 | `src/client/state.ts:64-69,93-98` |

### 关键发现

#### P1（重要，进入 T6b 前处理）

##### G1 “恰好 2000 个条目”的判定，方案与 PRD BR-07、AC-10（d）的字面不一致（需负责人决策）

- **证据**：
  - PRD BR-07（`spec/PRD.md:121`）：“累计最多读到 2000 个条目……**达到上限**后不再列出更深或剩余的目录；**达到上限**或 Host 返回任一目录已截断时……标记为不完整”。
  - PRD AC-10（d）（`spec/PRD.md:254`）：“读到第 2000 个条目后不再发出列目录请求”。
  - CODE_DESIGN §6.2 第 384、399 行与 T6b（TECH_DESIGN 第 237 行）：遇到第 2001 个才置 `capped`；“恰好 2000 个条目不判超限”；为确认没有第 2001 个，已计数但尚未列出的子目录**仍会被列一次**。
- **触发条件**：
  - 恰好 2000 个条目：按 PRD 字面应显示 COPY-15，按方案不显示。
  - 2001 个条目，且第 2000 个条目之后还有已计数但未列出的子目录（例如第 2000 个是 `a/x.md`，第 2001 个在 `c/` 中，中间还有空目录 `b/`）：方案在读到第 2000 个之后仍会列 `b/`、`c/`。按 AC-10（d）的字面写法，请求次数断言会失败。
- **影响**：T6b 的“恰好 2000 个条目不判超限”测试与 AC-10（d）的字面要求不能同时成立。按方案实现，业务验收或代码评审对照 AC 时会判不符；反过来按 AC 写测试，又与方案冲突。
- **可选方案**（本评审不修改 PRD，由负责人选择）：
  - **A（推荐，方案代码不变）**：PRD 改为“**超过** 2000 个条目（遇到第 2001 个）后不再列目录并标记不完整”；AC-10（d）改为“遇到第 2001 个条目后不再发出列目录请求”。这与 ROADMAP 的“超过 20000 行”口径一致，恰好 2000 个时不会误报。代价是在边界附近可能多发出若干次 `list`，仍在 1 + 2000 次的上限内。
  - **B（按 PRD 字面）**：计到第 2000 个即停止列目录并标记不完整。代码更短，测试更好写，AC 不用改。代价是恰好 2000 个条目时误报 COPY-15。需要同步修改 CODE_DESIGN §6.2 和 T6b 中“恰好 2000 个条目不判超限”的验收要求。
- **动作**：负责人选定后，PRD 与方案只改其中一方的措辞；T6b 的边界测试按选定口径写，并断言 `list` 调用次数。

#### P2（建议，可直接在方案中修正）

##### G2 风险表“`read` 每页只按行数限制、不按字节”与 Host 事实相反

- **证据**：TECH_DESIGN 第 3 节第 221 行。Host 的 `cutPage` 在页内容超过 `maxBytes`（默认 2 MiB）时立即抛出 `workspace-file/too-large`（`packages/api/workspace-files/src/index.ts:111-137`），README 的 Known Limitations 也写明“单行超过 `maxBytes` 的行在任何窗口都会失败”（`README.md:160`）。
- **影响**：`bytes` 缺省时，内存仍受 Host 页字节上限约束，这条残余风险实际不存在。但存在另一个真实的残余：这种情况下页面显示的是 Host 的 `too-large` 原文，而不是 COPY-16。另外，“按字节分块要改用 `readBytes`”的权衡说明也就不需要了。
- **动作**：把第 221 行改为：“`bytes` 缺省，或文件在 `stat` 之后变大、单页超过 Host `maxBytes` 时，Host 返回 `workspace-file/too-large`，按其他失败显示 Host 原文（COPY-08 / COPY-14），不显示 COPY-16。内存受 Host 页上限约束。不另加防护。”不需要用户决策。

##### G3 `stat` 预检应保留，但需补上真正的理由（不属于过度设计）

- **证据**：CODE_DESIGN §6 第 428 行给出的理由是“第一页本身可能已经很大”。根据 G2，第一页本身不超过 Host `maxBytes`，所以只靠这个理由，`stat` 看起来可以删掉：直接检查第一页的 `bytes` 也能满足 AC-10（b）中“不再发出后续请求”的要求。
- **推演**：删除 `stat` 后，一个大于 2 MB、且前 5000 行超过 2 MiB 的 ROADMAP，第一次 `read` 会直接得到 Host 的 `workspace-file/too-large`。插件此时拿不到 `bytes`，会显示 Host 原文，**违反 AC-10（b）**“{reason} 为 COPY-16”。如果改为把 Host 的 `too-large` 也映射成 COPY-16，又会在 Host `maxBytes` 配得更小时误报“超过 2 MB”。所以 `stat` 是满足 AC-10（b）最简单的做法。代价只是每次加载或刷新多一次轻量请求，而且两者的错误码完全一致（`src/index.ts:304-307`）。
- **动作**：把第 428 行的理由改为上面的推演，保留 `stat`。不需要用户决策。

##### G4 PRD COPY-14 的变量说明没有同步 COPY-16

- **证据**：`spec/PRD.md:161`，COPY-14 的变量规则仍是“{reason} 为 Host 返回的错误信息”；COPY-08（第 155 行）、BR-07、UI-01 刷新失败行（第 101 行）已写明超限时为 COPY-16。
- **影响**：只影响文字一致性。文案比对测试只比较中英文两列（`tests/copy.client.spec.ts:33-40`），不受影响。
- **动作**：PRD 作者在 COPY-14 变量列补上“超过 BR-07 上限时为 COPY-16”。这是已确认规则的同步，不需要再决策。

##### G5 业务测试计划未覆盖 AC-10

- **证据**：`test/TEST_PLAN.md` 中没有 AC-10、COPY-15、COPY-16 的条目；T6b 已规划单元和组件测试覆盖（a）～（e）以及请求次数，PRD 也写明“不要求人工构造大文件”。
- **影响**：自动化覆盖已有安排，缺的是测试计划中的追溯行。如果业务验收按 TEST_PLAN 逐条进行，AC-10 会被遗漏。
- **动作**：由编排者决定是否调用 my-create-test-plan，在 TEST_PLAN 中补一行，把 AC-10 映射到 T6b 的自动化测试。本评审不派发。

##### G6 NFR-04 的上限是“每个 Feature”的，过滤路径会把它乘以 Feature 数

- **证据**：过滤时 `wantedDirs` 返回全部 Feature 目录（`src/client/state.ts:125-134`），各 Feature 的 `listFeatureFiles` 并发启动、不限并发（`src/client/WorkbenchBody.tsx:133-137`）。TECH_DESIGN 第 220 行写的是“Feature 个数受 ROADMAP 行数约束”。
- **影响**：上限确实固定，满足 NFR-04 的字面要求，但理论值约为 2 万个 Feature × 2001 次 `list`。在真实的规格仓库里不会出现这种情况，所以不建议现在加并发限制。
- **动作**：在第 220 行补一句“上限按 Feature 计，过滤时乘以 Feature 数；暂不限制并发，出现卡顿再加”，作为已知残余风险。不需要用户决策。

### 保持现状（核对后无问题）

- ROADMAP 判定顺序：先 `stat`，再在每页判断 `bytes` 和累计行数；`total > 20000`、`bytes > 2 MiB` 都用严格大于，与 PRD“超过”一致；超限时 `pages` 随返回值一起丢弃，最多多读一页。
- `MAX_ROADMAP_BYTES = 2 * 1024 * 1024` 即 2 MiB，与 Host `maxBytes` 默认值相同。COPY-16 写作“2 MB”，属于用户可读的近似写法，可以接受。
- `Reason` 联合类型在渲染时取 COPY-16，随界面语言切换；失败码 `sdd-workbench/roadmap-too-large` 带插件前缀，不会与 Host 错误码混淆。
- 条目计数先跳过隐藏项再判断上限，符合 BR-07“以 `.` 开头的不计”；Host 截断只做标记、继续列其他目录；达到上限后不再列目录，所以之后不会再出现失败，“失败优先于不完整”只在达到上限之前适用，语义自洽。
- 清单为空但不完整时只显示 COPY-15，过滤视图中展开同样显示；过滤只在已读到的文件中匹配，这是 BR-07 的明文规定。
- §3 末尾划线说明已由 §6 取代，指向正确。

### 实施提示（非发现）

- PRD 已新增 COPY-15/16，但 `tests/copy.client.spec.ts` 的 `KEYS` 还没有对应键，“maps every PRD copy id”用例（第 46-48 行）在 T6b 落地前会失败。T6b 应与 PRD 的这次改动在同一批提交中完成，不要单独推送 PRD 的改动。
- T6b 的测试替身需要同时提供 `stat` 和 `read`，并覆盖“`stat` 未超限、某一页 `bytes` 超限”（CODE_DESIGN 第 343 行）这一分支；逐文件 100% 覆盖率会强制要求它。

### 必须补齐 / 可删除 / 保持

| 类别 | 事项 |
|---|---|
| 进入 T6b 前必须处理 | G1（负责人选择 A 或 B，并同步 PRD 或方案） |
| 可直接修正 | G2、G3（方案措辞）；G4（PRD 变量说明）；G6（风险表补一句） |
| 转交编排者 | G5（TEST_PLAN 追溯行） |
| 可以删除或延后 | 无。`stat` 预检经推演应保留（G3） |

### 增量评审历史

| 日期 | 事件 |
|---|---|
| 2026-11-21 | K8 增量评审：有条件通过，待处理 G1（需决策）、G2～G6 |

### 处理结果（2026-11-21，方案作者）

| 发现 | 处理 |
|---|---|
| G1 | 用户选择选项 A：PRD BR-07、AC-10 改为“遇到第 2001 个条目才停止并标记不完整”，新增 AC-10（f）恰好 2000 个不显示 COPY-15；方案不变 |
| G2 | 风险表改正；另把 Host `workspace-file/too-large` 折叠为 `sdd-workbench/roadmap-too-large`，页面统一显示 COPY-16（CODE_DESIGN §6.1），该残余不再存在 |
| G3 | CODE_DESIGN §6 审查问题改写 `stat` 预检理由 |
| G4 | PRD COPY-14 变量说明补“超过 BR-07 上限时为 COPY-16” |
| G5 | 转编排者：T6b 前由 my-create-test-plan 补 AC-10 |
| G6 | 风险表记为已知残余风险，不加并发限制 |
