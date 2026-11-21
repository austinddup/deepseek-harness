# 代码评审：999 SDD 工作台

[返回需求简报](../BRIEF.md)

> 评审日期：2026-11-21 | Profile：standard | 有效需求来源：[PRD](../spec/PRD.md)（2026-11-21 版本，AC-01～AC-10） | 设计：[技术方案](../design/TECH_DESIGN.md)（含 K8）、[代码设计附录](../design/CODE_DESIGN.md)、[方案评审](../review/design_review.md) | 测试计划：[TEST_PLAN](../test/TEST_PLAN.md)

## 1. 总体结论

**最终结论（2026-11-21 收尾复评）：建议合并**，指本地分支 `feat/sdd-workbench` 收尾。用户已决定 `mai-specs/` 不提交上游，只在本地使用。

依据：

1. AC-01～AC-10 都有实现和自动化证据，人工验收 TC-01～TC-11 已全部执行并通过。TC-09 第一次失败，经 T9 修复后复测通过，见 [TEST_PLAN 执行结果](../test/TEST_PLAN.md#执行结果)。
2. 评审发现中没有 P0。P1-1、P2-1、P2-2、P2-4、P2-5 已关闭，复核依据见第 3 节和第 7 节；P2-3 由用户决定延后。
3. 收尾时评审方复核：
   - 包测试：`pnpm exec vitest run packages/experimental/sdd-workbench` 退出 0，8 个文件、133 个用例通过。
   - `pnpm run hygiene`：唯一失败是 vendor rescope，残留在 4 个文件里。`git diff master` 确认这 4 个文件与 master 完全一致，所以是 master 已有的问题，不是本分支引入的。
   - 修复方报告：typecheck 退出 0，Web e2e 3 个用例通过，check:i18n 退出 0；`test:docs` 在临时移开未跟踪的 `mai-specs/README.md` 后 21 项全部通过。

延后项与剩余风险见第 8 节。

## 2. 范围与证据

**比较对象**：分支 `feat/sdd-workbench` 相对 `master`，用 merge-base 到 head（提交「新增 SDD 工作台真实 Web 组合测试并补齐新包登记（T8）」，2026-11-21）计算累计 diff，共 66 个文件。工作区里 `.gitignore`、`AGENTS.md`、`CLAUDE.md`、`.my-ai-infra.json`、`mai-specs/README.md` 的改动是用户本地工具配置，不在评审范围内。

**重点审查文件**：`packages/experimental/sdd-workbench/src/**`、`tests/**`、README 三件套、`sdd-workbench.patch.yml`、`package.json`；`apps/web/tests/sdd-workbench-panel.*`；`scripts/experimental-package-policy.ts`、`scripts/verify-package-readme-model-experience.ts`、tsconfig 与生成目录的登记行。

**已执行检查**（仓库根目录，head 版本，工作区只有上述范围外改动）：

| 命令 | 结果 |
|---|---|
| `pnpm exec vitest run packages/experimental/sdd-workbench` | 退出 0，7 个文件、127 个用例全部通过 |
| `pnpm exec vitest run --config vitest.web.config.ts apps/web/tests/sdd-workbench-panel.e2e.ts` | 退出 0，3 个用例通过。已核对 `lib/client.js` 构建时间晚于最后一次实质源码修改；T8 只给 `state.ts` 补了注释 |
| `pnpm run check:i18n` | 退出 0，3 个门禁通过 |
| `pnpm run test:docs` | 退出 1，唯一失败是 translation pairing，原因是未跟踪的 `mai-specs/README.md`（范围外的本地文件）；其余 20 项通过 |
| 直接对包运行 `eslint` | 仓库 ESLint 配置不支持这种调用方式，未得到结论；`lint`、`typecheck`、`hygiene` 本次未运行 |

**AC 与证据对照**：

| AC | 实现 | 自动化证据 | 尚缺 |
|---|---|---|---|
| AC-01 入口 | `client/index.ts:28-36`、`definition.ts:19-31` | `apply.client.spec.ts`（注册、只注入两个读取回调、卸载后撤回）；Web e2e 从引导页打开 | 人工 TC-01（分栏内去重由框架保证） |
| AC-02 分组排序 | `roadmap.ts:52-90` | `roadmap.client.spec.ts`；组件测试；e2e 断言顺序 `997,998,999,990` | 人工核对真实 ROADMAP |
| AC-03 文件清单 | `feature-files.ts:54-91` | `feature-files.client.spec.ts`（隐藏、排序、深度 8/9）；e2e ARIA 基准 | 人工 PNG/PDF 预览 |
| AC-04 打开预览 | `WorkbenchBody.tsx:158-162` | 组件测试（分栏与浮动参数）；e2e 打开 PRD 并看到正文 | 人工确认不重复打开 |
| AC-05 刷新 | `state.ts:93-105`、`WorkbenchBody.tsx:116-126` | 组件测试（在 999 前插入一行后展开保留、失败保留旧列表、迟到结果丢弃） | 人工 TC-11 |
| AC-06 a～g | `state.ts:69-75`、`WorkbenchBody.tsx:190-204`、`childRows` | 组件测试 a～g | 人工抽查 b |
| AC-07 只读/越界 | `face.ts:53-83` 只用 stat/read/list；`roadmap.ts:159-175` 先归一化再判断前缀；`state.ts:140` 越界行不请求 | `roadmap.client.spec.ts`（resolveFeatureDir）；组件测试（越界行不调用列目录回调）；e2e 越界行显示 COPY-09 | 人工 `git status --ignored` 快照比对 |
| AC-08 文案 | `locales.ts` | `copy.client.spec.ts` 逐字比对 PRD COPY-01～16；`check:i18n` 通过 | 人工切换语言抽查 |
| AC-09 过滤 | `filter.ts`、`state.ts:146-161` | `filter.client.spec.ts`；组件测试（只命中文件时自动展开、清空后恢复、Escape） | 人工抽查 |
| AC-10 a～f | `face.ts:55-76`、`feature-files.ts:56-80` | `face.client.spec.ts`（恰好 20000 行、20001 行时读到第 5 页即停、stat 超过 2 MB 时不读、恰好 2 MB 可读、Host too-large）；`feature-files.client.spec.ts`（恰好 2000、第 2001 个即停并断言请求列表、Host 截断、失败优先）；组件测试（COPY-15 在展开与过滤视图中都显示、COPY-16 填入 COPY-08/14） | 无（PRD 不要求人工验证） |

**重点核查结论**（静态审查加上述测试）：

- **workspace-files 契约**：`read` 的 `text` 不带末尾换行（`packages/api/workspace-files/src/types.ts:55-62`），所以 `pages.join('\n')` 拼回的内容正确。`bytes` 是整个文件的大小，逐页复查可以发现读取期间文件变大。`offset` 从 1 开始，越过末行时 `lines: 0`，与实现一致。Remote 失败折叠为值，只有装配错误才会 reject，因此 `.then` 不会卡在加载状态。
- **边界值**：行数用 `total > 20000` 判断，大小用 `bytes > 2*1024*1024` 判断，条目在 `counted === 2000` 后遇到下一个非隐藏条目时才停，三者都是“超过才算超限”，与 BR-07 和 AC-10(f) 一致。
- **中止与代数计数**：刷新、cwd 或 sessionId 变化、卸载时都会 abort，并让代数加一。ROADMAP 和文件清单的结果都按发起时的代数丢弃。`start` 会清掉仍在加载的清单，刷新失败后由 `wantedDirs` 在新的代数下重新请求；刷新期间 `wantedDirs` 返回空。没有找到能让旧结果写进新状态的交错顺序。
- **越界**：URL、绝对路径、锚点、反斜杠、百分号编码的 `..`、`mai-specs-evil/`、`mai-specs` 本身都按设计处理。
- **React key 与键盘**：行键、文件键（`<行键>/<路径>`）、提示键（`<行键>:note`）、分区键互不冲突，`Tooltip` 会合并 ref 和 onFocus，整棵树只有一个 Tab 停靠点。
- **生命周期与 HMR**：三项注册都通过 `ctx.effect` 完成，有卸载测试；没有模块级可变状态；组件不接触 `ctx`。

## 3. 关键发现

### P0

无。

### P1-1 recorded-session 豁免没有可追溯的决定来源（已关闭）

- **位置**：`packages/experimental/sdd-workbench/README.md:128`、`README.zh.md:128`
- **触发条件**：分支按现状合入，或提交到上游。
- **机制与影响**：仓库规则（根 `AGENTS.md:161`、`docs/testing.md:55`）要求每个非平凡的用户可见改动在同一 PR 中新增 keyless recorded-session 场景，并写明包测试和 e2e 不能替代。README 写的是“经 owner 决定豁免”，但 BRIEF、技术方案、方案评审和测试计划里都找不到这项决定的记录。按规则审查时，这会被判为缺少必需证据，同时 README 中的声明也无法复核。
- **归因**：本分支新增（提交「新增 SDD 工作台真实 Web 组合测试并补齐新包登记（T8）」，2026-11-21）。
- **证据状态**：已确认（文本检索）。
- **是否阻断**：取决于用户的决定。只在本地使用或作为作业时，把决定补记到 BRIEF 关键决策即可，不阻断；要提交上游时，需要维护者认可豁免，或者补上场景。
- **最小修复**：A）在 BRIEF 关键决策中记录豁免决定的日期、决定人和适用范围，README 改为链接这条记录；或 B）按 `snapshots/AGENTS.md` 新增一个 Web keyless 场景。
- **复验**：A）检查 BRIEF 中的记录和 README 链接；B）`pnpm run test:snapshot -t <场景名>`。
- **复评（2026-11-21，关闭）**：用户选 A。技术方案 1.3 新增 K9 决策行，写明决定人与日期（用户 2026-11-21，T8 选 A）、替代证据（Web 组合测试比对 ARIA 基准并打开 PRD）、理由（页面不调用模型，没有会话可录）、适用范围（仅本实验包）和退出条件（进入 profile 或 bundle 时须补场景）。BRIEF 关键决策新增 2026-11-21 一条并指向 K9。我核对过 `packages/experimental/client-ui-stats/README.md:106`，同类豁免的先例属实。README 仍写“经 owner 决定”，没有直接链接 K9，但开发备注链接到 BRIEF，可以追溯，不再作为问题。由于 `mai-specs/` 不提交上游，这项豁免只在本地成立；以后要提交上游，仍需维护者认可。

### P2-1 Host 不报告文件大小时，ROADMAP 读入的总量只受行数限制（已关闭）

- **位置**：`packages/experimental/sdd-workbench/src/client/face.ts:59-74`
- **触发条件**：文件系统后端的 `stat` 和 `read` 都不返回 `bytes`，而 ROADMAP 不超过 2 万行，但单行很长。
- **机制与影响**：此时只剩“累计行数不超过 20000”和 Host 单页上限（默认 2 MiB）两道限制，`pages` 可能累积到 2 MB 的数倍。这符合 BR-07 的字面条件（只看 Host 报告的大小），但 NFR-04 的内存上限会被放大。本地文件系统后端会报告大小，实际很难触发。
- **最小修复**：在循环中累计 `result.value.text.length`（或 UTF-8 字节数），超过 `MAX_ROADMAP_BYTES` 就返回 `TOO_LARGE`，并在 `face.client.spec.ts` 加一个“不报大小且多页累计超过 2 MB”的用例。
- **是否阻断**：否。
- **复评（2026-11-21，关闭）**：`face.ts` 现在用 `TextEncoder` 逐页累计已读文本的 UTF-8 字节数，用 `oversized(read)` 判断，超过 2 MB 就返回 too-large，并且在保存这一页之前停止，不再发后续请求。新用例覆盖两种情况：恰好 2 MB（含多字节字符）可以通过；两页累计多出 1 字节时拒绝，且只请求了 2 次。修复方说明删掉该判断后用例会失败，已做反向验证。我重跑包测试，7 个文件、128 个用例通过。累计值不含页与页之间补回的换行符，最多少算几千字节，对上限没有实质影响。K8 和 CODE_DESIGN §6 已同步。

### P2-2 README 实现说明与代码有两处不一致（已关闭）

- **位置**：`README.zh.md:79`、`README.md:79`（说 ROADMAP 只通过 `read` 分页读取，漏了读之前的 `stat` 大小预检）；`README.zh.md:126` 及其英文对应行（说页面“只在打开、切换工作区和刷新时读取”，实际上展开 Feature 和输入过滤词也会列目录）。
- **影响**：读者对读取时机和上限的理解会有偏差，不影响功能。
- **最小修复**：第 79 行补上“先 `stat` 检查大小”；第 126 行改为“不监听磁盘变化，ROADMAP 只在打开、切换工作区和刷新时读取”。修改后运行 `pnpm run test:docs`。
- **是否阻断**：否。
- **复评（2026-11-21，关闭）**：中英 README 第 79 行都已写明先 `stat` 后分页 `read`。第 126 行改为“ROADMAP 在打开、切换工作区和刷新时读取，需求目录在展开或过滤需要时列出，不监听磁盘”，与 `WorkbenchBody.tsx` 和 `state.ts` 的行为一致。`README.i18n.yaml` 中两个章节的配对指纹已重录。修复方报告 doc-sync 42/43 通过，唯一失败仍是范围外未跟踪的 `mai-specs/README.md`。

### P2-3 树形键盘导航只实现了 APG 的基本子集（用户决定延后）

- **位置**：`WorkbenchBody.tsx:265-284`、`:170-171`
- **现象**：在文件行或已收起的 Feature 上按左方向键，焦点不会移到父行；不支持 Home/End；扁平树没有 `aria-setsize`/`aria-posinset`；点刷新后按钮被禁用，焦点会丢到 body。
- **影响**：PRD UI-01 只要求方向键移动、Enter/Space 切换，所以不违反 AC，但屏幕阅读器和纯键盘用户用起来不够顺。
- **最小修复**：在左方向键分支里找前面最近一个层级更低的行并移动焦点，补 Home/End。刷新期间可以改用 `aria-disabled` 代替 `disabled`，保留焦点。
- **是否阻断**：否。
- **状态（2026-11-21）**：用户决定延后，保持未关闭。

## 4. 待验证事项

| 事项 | 状态 | 完成条件 |
|---|---|---|
| TEST_PLAN 人工验收 TC-01～TC-11（AC-01/03/04/05 真实界面、AC-07 快照比对、AC-08 语言切换） | 已执行（2026-11-21，主 Agent 同步）：全部通过，TC-09 经 T9 修复后复测通过，结果见 [TEST_PLAN 执行结果](../test/TEST_PLAN.md) | 已满足 |
| `typecheck`、`hygiene` | 主 Agent 同步：`typecheck` 退出 0。评审方收尾时重跑了 `hygiene`，唯一失败是 vendor rescope，涉及 `apps/web/tests/creator-persona.e2e.ts`、`docs/upgrade-guide/v0.2.2-rc.1/subagent-interrupt-default/guide.md` 及其中文版、`packages/experimental/cua/tests/agent-scopes.spec.ts`；`git diff master` 显示这 4 个文件没有差异，问题在 master 上已存在 | 已满足 |
| 修复后的 Web e2e 回放 | 修复方报告 T9 后 3 个用例通过；评审方没有重跑 Web e2e，收尾时重跑包测试 133 个通过 | 已满足，作为修复方证据记录 |
| `test:docs` 在干净工作区的结果 | 主 Agent 同步：临时移开未跟踪的 `mai-specs/README.md` 后 21 项全部通过 | 已满足 |

## 5. 用户决定（2026-11-21 已决定）

1. P1-1 选 A：补记豁免决定，见技术方案 K9。
2. `mai-specs/` 只保留在本地，不提交上游。`copy.client.spec.ts` 继续读取 PRD，不需要改；以后如果改为提交上游，需要重新评估这个测试的依赖，以及 `mai-specs/README.md` 的中英配对。
3. P2-3 延后。

## 6. 其他建议

- 越界检查只比较路径文本：`mai-specs/` 下如果有一个符号链接目录指向工作区内别的位置（比如 `src/`），它会被列出来。这仍在 BR-01 的工作区边界之内，也不会写入，可以考虑在 README Known Limitations 里和 `mai-specs` 本身是符号链接的情况一起说明。

## 7. 增量评审：T9 验收修订（语言切换）

> 日期：2026-11-21 | 比较对象：head 提交《处理 SDD 工作台代码评审：ROADMAP 已读字节兜底上限、补记快照豁免决定》加上工作区未提交改动。范围外：用户本地配置文件，以及另一个子任务正在写的 `test/TEST_PLAN.md`（本轮未读）。

**结论：有条件合并，结论不变。** 实现与修订后的 PRD 一致，未发现阻断问题。新增 P2-4 和 P2-5 两项，都只是文档同步问题。

**审查内容与证据**：

- **tab 标题随语言切换（缺陷修复）**：`WorkbenchTitle.tsx` 每次渲染都用 `t('title')` 取标题；`client/index.ts` 通过 `ctx.effect` 把它注册到 `sidebar.right.pane.tab.title` 和 `locale: NS`，写法与 `packages/client/ui-sidebar-files/src/client/index.ts:181-184` 的先例一致，卸载后的撤回由 `apply.client.spec.ts`（注册项从 1 个变为 2 个，卸载后为空）覆盖。`definition.ts` 里的 `title` 函数照旧保留，用于侧边栏存储的标题和引导页，两者不冲突。
- **分组名按界面语言显示（需求变更）**：`WorkbenchBody.tsx` 把分组标签改为 ``t(`section.${section}`)``。ROADMAP 解析仍按 `roadmap.ts:8-12` 的中文标题识别分区，识别和显示分开，过滤、行键和排序都不受影响。8 种语言都补齐了 3 个键，`zh`、`en` 与 PRD COPY-17～19 逐字一致，由 `copy.client.spec.ts` 覆盖。
- **测试**：`workbench-body.client.spec.tsx` 新增切换字典后分组名和页头随之变化的用例；`workbench-title.client.spec.tsx` 覆盖标题切换。Web e2e 在已打开的页面上切换到中文，断言 tab 标题、页头和分组名变化，同时 Feature 标题不变；ARIA 基准里的分组名改为英文。
- **已执行**：`pnpm exec vitest run packages/experimental/sdd-workbench` 退出 0，8 个文件、133 个用例通过。修复方报告：3 次反向验证均符合预期；build:artifacts、build:check、typecheck、lint、check:i18n、verify-export-jsdoc、verify-no-unknown-casts 都退出 0；Web e2e 回放 3 个用例通过；用户在真实 DSH 中重测 TC-09 通过。这些作为修复方证据记录，本轮未重跑。

**新发现**：

### P2-4 技术方案中的 COPY 编号范围没有同步到 COPY-19

- **位置**：`design/TECH_DESIGN.md:9`（“COPY-01～COPY-16”）、`:199`（2.3.4 文案节“逐字取自 PRD COPY-01～COPY-16”）。
- **影响**：技术方案对需求来源的引用范围与 PRD 不一致，读者会以为 COPY-17～19 不在设计范围内。不影响功能。
- **最小修复**：两处都改为 COPY-01～COPY-19；2.3.4 补一句“COPY-17～19 键为 `section.in-progress`、`section.planned`、`section.done`”。需要时同步 HTML 版本。
- **是否阻断**：否。
- **复评（主 Agent 同步，2026-11-21）**：已修复。技术方案第 9 行与 2.3.4 改为 COPY-01～COPY-19 并补键名。评审方更正：HTML 版没有重新生成，只在文件树里增量加了一行 `WorkbenchTitle.tsx`。HTML 版本来就不含 COPY 编号范围和任务编号，所以内容上不需要再同步。

### P2-5 BRIEF 和 PRD 决策表没有登记分组名按界面语言显示这项用户决定

- **位置**：`BRIEF.md` 的关键决策（本轮未修改）；`spec/PRD.md` 的待确认事项与决策表（约第 261～276 行）没有新增对应行，只在变更记录第 293 行出现。
- **影响**：这项决定推翻了原 COPY-04“取 ROADMAP 原文”的规则，属于需求变更。目前只能在变更记录里找到，按决策维度追溯时容易漏掉。
- **最小修复**：在 PRD 决策表加一行（来源：用户验收 TC-09，2026-11-21；关联 COPY-04、COPY-17～19、AC-08；austin / 已确认），并在 BRIEF 关键决策加一条，指向技术方案 T9。
- **是否阻断**：否。
- **复评（主 Agent 同步，2026-11-21）**：已修复。PRD 待确认事项表新增该决定行（指向技术方案 T9），BRIEF 关键决策新增 2026-11-21 一条。

**是否需要单独补 PRD 评审或方案评审**：不建议单独补。理由如下：
1. 需求侧只有一处显示规则的变更（分组名本地化）和一个缺陷修复（标题），没有触及数据范围、权限、读取边界、只读约束或任何其他 AC。
2. 设计侧只多了一个复用已有扩展点（`sidebar.right.pane.tab.title`）的展示组件，没有新的接口、状态或风险。
3. 本轮已核对 PRD 修订之间的一致性：UI-01 中 tab 标题和阶段分组两行、COPY-04 的变量说明、COPY-17～19 与 AC-08 互相一致，与实现和测试也一致。唯一的缺口是 P2-4 和 P2-5 这两处文档登记，修完即可，不需要单独开评审。

**AC-08 的人工证据**：用户报告 TC-09 已在真实 DSH 中重测通过。TEST_PLAN 的其余人工用例仍按第 4 节记为待验证。

## 8. 收尾复评（2026-11-21）

**核实结果**（逐项核对文件，没有直接采信交接说明）：

| 交接项 | 核实 |
|---|---|
| 人工验收 TC-01～TC-11 | 属实。`test/TEST_PLAN.md` 的“执行结果”节列出全部用例结论，TC-09 首次失败、T9 后复测通过，Q17 标为已处理；关闭按钮遮挡标题的问题作为非 AC 观察项记录，用户决定暂不处理 |
| P2-4 | 属实。`design/TECH_DESIGN.md:9` 和 `:199` 已改为 COPY-01～COPY-19，并补了键名。“HTML 已重新生成”的说法不准确，已在 P2-4 复评行中更正为“增量更新”，对内容没有影响 |
| P2-5 | 属实。`spec/PRD.md:276` 新增了决定行，`BRIEF.md:27` 新增了 2026-11-21 的关键决策 |
| 检查结果 | 包测试和 hygiene 已由评审方重跑并核实（见第 1 节）。typecheck、Web e2e、check:i18n、test:docs 采用修复方的报告，评审方没有重跑 |
| 第 4 节“已满足”的措辞 | 人工验收、test:docs 两行属实。typecheck/hygiene 行已改为评审方的核实结果；Web e2e 行里过时的“128 个”已改为现状 |

**延后项**（不阻断，用户已决定）：
- P2-3：树形键盘导航只实现了 APG 的基本子集，缺少左方向键回到父行、Home/End、`aria-setsize`/`aria-posinset`；刷新时按钮被禁用，焦点会丢失。
- 选中或悬停 tab 时关闭按钮遮住标题末尾。这是 ui-dockkit 的共用规则造成的，不是本插件的缺陷。

**剩余风险**：
- 只在本地有效的前提：`mai-specs/` 不提交上游，`copy.client.spec.ts` 依赖本地的 PRD；K9 的 recorded-session 豁免也只在本地成立。将来如果提交上游，需要维护者认可豁免或补场景，把 COPY 表迁到包内，并处理 `mai-specs/README.md` 的中英配对。
- 其余 6 种语言是 AI 翻译，没有经过人工校对（不在 NFR-01 验收范围内）。
- 过滤时所有 Feature 并发列目录，总请求数是 Feature 个数乘以单个 Feature 的上限（方案评审 G6 已接受）。`mai-specs/` 下指向工作区内其他位置的符号链接目录会被列出（第 6 节，仍在 BR-01 的边界之内）。
- T9 及其同步修改目前还是工作区里未提交的改动。本地合并前需要先提交，再按第 1 节的范围重跑一次包测试，确认结论对应的就是提交后的版本。
