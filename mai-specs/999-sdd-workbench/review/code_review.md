# 代码评审：999 SDD 工作台

[返回需求简报](../BRIEF.md)

> 评审日期：2026-11-21 | Profile：standard | 有效需求来源：[PRD](../spec/PRD.md)（2026-11-21 版本，AC-01～AC-10） | 设计：[技术方案](../design/TECH_DESIGN.md)（含 K8）、[代码设计附录](../design/CODE_DESIGN.md)、[方案评审](../review/design_review.md) | 测试计划：[TEST_PLAN](../test/TEST_PLAN.md)

## 1. 总体结论

**有条件合并（2026-11-21 复评后）。** 实现与 PRD、技术方案一致，AC-01～AC-10 的开发测试证据齐全，没有 P0。首轮发现中，P1-1、P2-1、P2-2 已修复，复核依据见第 3 节。P2-3 由用户决定延后，不阻断。

用户已决定 `mai-specs/` 只保留在本地、不提交上游（作业场景），所以 `copy.client.spec.ts` 继续读取 PRD，不需要改。

仍需满足的条件：TEST_PLAN 的人工验收 TC-01～TC-11 还没执行。AC-01、AC-03、AC-04、AC-05 的真实界面部分只能靠人工步骤证明，需要在结项前完成。

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
| TEST_PLAN 人工验收 TC-01～TC-11（AC-01/03/04/05 真实界面、AC-07 快照比对、AC-08 语言切换） | 未执行 | 需求负责人按 TEST_PLAN 执行并记录结果 |
| `typecheck`、`hygiene` | 未执行。修复方报告 `build:check` 退出 0、oxlint 对包与 mai-specs 退出 0 | 在修复版本上运行，全部退出 0 |
| 修复后的 Web e2e 回放 | 修复方报告重建 bundle 后 3 个用例通过；评审方本轮只重跑了包测试（128 个通过） | 已满足，作为修复方证据记录 |
| `test:docs` 在干净工作区的结果 | 唯一失败来自范围外的未跟踪 `mai-specs/README.md` | 移开该文件或在干净 worktree 中重跑后通过 |

## 5. 用户决定（2026-11-21 已决定）

1. P1-1 选 A：补记豁免决定，见技术方案 K9。
2. `mai-specs/` 只保留在本地，不提交上游。`copy.client.spec.ts` 继续读取 PRD，不需要改；以后如果改为提交上游，需要重新评估这个测试的依赖，以及 `mai-specs/README.md` 的中英配对。
3. P2-3 延后。

## 6. 其他建议

- 越界检查只比较路径文本：`mai-specs/` 下如果有一个符号链接目录指向工作区内别的位置（比如 `src/`），它会被列出来。这仍在 BR-01 的工作区边界之内，也不会写入，可以考虑在 README Known Limitations 里和 `mai-specs` 本身是符号链接的情况一起说明。
