# 业务测试计划：999 SDD 工作台

[返回需求简报](../BRIEF.md)

> Profile：standard | 模板：`mai-specs/_templates/TEST_PLAN.tmpl.md` | 有效需求来源：[PRD](../spec/PRD.md)（2026-11-21 版本，AC-01～AC-10；含同日增补的 BR-07、NFR-04、AC-10、COPY-15/16，及验收后修订的 COPY-04、COPY-17～19、AC-08、UI-01） | 编写基线：`feat/sdd-workbench` 提交「新增 SDD 工作台插件骨架，验证 patch 相对路径加载（T1）」（2026-11-20）；2026-11-21 按 PRD BR-02/BR-06 排序修订与 999 进入开发更新，更新基线为提交「实现 Feature 目录的递归列文件与排序（T3）」（2026-11-21；T1～T3 已提交，T4～T8 未实现）；2026-11-21 按 PRD 读取数量上限增补（BR-07、NFR-04、AC-10、COPY-15/16，COPY-08/14 变量说明与 UI-01 状态表）再次更新，更新基线为提交「新增 SDD 工作台中英文案与 PRD 文案表的逐字比对测试（T6）」（2026-11-21；T1～T6 已提交，T6b、T8 未实现，T7 的 README 草稿在工作区中未提交）；2026-11-21 用户验收后按 PRD 修订（分组阶段名按界面语言显示、tab 标题随语言切换：COPY-04、COPY-17～19、AC-08、UI-01；技术方案 T9）更新 TC-09，并记录验收结果，被测版本为提交《处理 SDD 工作台代码评审：ROADMAP 已读字节兜底上限、补记快照豁免决定》（2026-11-21）加工作区未提交的 T9 修改 | 状态：已执行（2026-11-21），结果见[执行结果](#执行结果)

## 范围与依据

- **验收对象**：DSH Web 右侧栏插件“SDD 工作台”，范围为 PRD FR-01～FR-08 与 AC-01～AC-10；其中 AC-10 只由开发测试证明（PRD 写明不要求人工构造大文件），不设人工用例。预期结果一律取自 [PRD](../spec/PRD.md) 的 AC、BR、COPY 与 UI-01 状态表；[技术方案](../design/TECH_DESIGN.md)和[方案评审](../review/design_review.md)只用于确认启动方式、数据根和开发阶段计划写的测试。
- **执行方式**：需求负责人在 DSH Web 中按下文顺序从 TC-01 走到 TC-11；AI 只负责准备、改动和清理测试数据，以及前后快照比对。用例顺序有依赖：AC-07 的只读快照窗口覆盖 TC-01～TC-09，必须在 TC-11（AC-05，验收者主动改磁盘）之前结束。
- **本次变更（2026-11-21）**：用户验收 TC-09 时发现切换语言后 tab 标题不变（缺陷），并决定分组阶段名改为按界面语言显示（中文“进行中/规划中/已完成”，英文“In progress/Planned/Done”）；ROADMAP 中的中文分区标题只用于识别分区；已打开页面切换语言时 tab 标题、页头、分组名随之更新；Feature 标题为 ROADMAP 原文，不翻译（PRD COPY-04、COPY-17～19、AC-08、UI-01“tab 标题”“阶段分组”行；技术方案 T9）。受影响用例只有 TC-09；TC-02、TC-06、TC-11 在中文界面下的分组名（COPY-17～19 中文与 ROADMAP 分区标题字面相同）预期不变。
- **执行前提**：T2～T8（含 T6b）完成且开发测试通过，插件 README（T7）已写好。2026-11-21 执行时已满足（见“已有测试覆盖”）；TC-09 的复测另需 T9 完成。
- **不在本计划内**：解析、文件清单、过滤、状态机、文案字典等由开发阶段自动测试覆盖的断言（见下表），不再写成人工用例；其余 6 种发布语言（PRD NFR-01 明确不在验收范围）；Mermaid 与相对链接等文档预览自身的渲染细节（AC-04 已排除）。

## 已有测试覆盖

开发测试来自技术方案第 5 节的计划项，位于 `packages/experimental/sdd-workbench/tests/`（下表省略该前缀）：`roadmap.client.spec.ts`、`feature-files.client.spec.ts`、`filter.client.spec.ts`、`face.client.spec.ts`、`apply.client.spec.ts`、`workbench-body.client.spec.tsx`、`workbench-title.client.spec.tsx`（T9）、`copy.client.spec.ts`，均已编写。另有真实 Web 组合测试 `apps/web/tests/sdd-workbench-panel.e2e.ts`（T8，T9 增补语言切换）。

**当前结果依据**：主 Agent 2026-11-21 在被测版本（含 T9 工作区修改）上运行本包测试，133 个通过，`src/**` 逐文件 100% 覆盖率；本计划未自行运行。主 Agent 同日在被测版本上另行运行：Web 组合测试 `pnpm exec vitest run --config vitest.web.config.ts apps/web/tests/sdd-workbench-panel.e2e.ts` 3 个通过；`pnpm run check:i18n` 退出 0；`pnpm run test:docs` 唯一失败为本地未跟踪、不提交的 `mai-specs/README.md`，临时移开后 21 项全部通过（见 Q17）。

`copy.client.spec.ts` 在测试时读取 PRD 文案表，断言“PRD 中每个 COPY 编号都有映射且仅此”，并逐条比对 zh/en；当前映射为 COPY-01～COPY-19，与 PRD 一致（原先 COPY-15/16 缺映射的问题已由 T6b 解决）。

| 需求 / 业务行为 | 已有测试或入口 | 覆盖范围及结果依据 | 仍需补验的部分 |
|---|---|---|---|
| AC-01 入口注册 | T5/T9 `apply.client.spec.ts`（注册页面类型、引导卡片、页面与 tab 标题两个组件、只交给页面两个读取回调、插件卸载时撤回全部注册）；Web 组合测试（从引导页卡片打开） | 本包测试通过（133）；Web 组合测试待核验 | TC-01：真实启动、卡片、分栏内去重（已通过） |
| AC-02 分组、排序与无效行 | T2 `roadmap.client.spec.ts`；T5 `workbench-body.client.spec.tsx`（固定分区顺序、计数）；Web 组合测试（三个分区、组内按编号升序） | 本包测试通过；覆盖构造数据（五列/四列、无效行、缺失分区、按编号排序、数字与非数字编号混排、同编号保持行序） | TC-02（已通过） |
| AC-03 文件清单 | T3 `feature-files.client.spec.ts`（排序、隐藏文件、错误归类、深度上限）；T5 `workbench-body.client.spec.tsx`（展开列出、`BRIEF.md` 置顶、收起）；Web 组合测试（隐藏文件 `.hidden.md` 不列，ARIA 基准） | 本包测试通过 | TC-04（已通过） |
| AC-04 打开预览 | T5 `workbench-body.client.spec.tsx`（打开调用参数：本分栏与浮动 tab）；Web 组合测试（点击 `spec/PRD.md` 后出现 PRD 预览 tab 并显示正文） | 本包测试通过；Web 组合测试待核验 | TC-05（已通过） |
| AC-05 刷新 | T2（插入行按编号就位、不改变已有行的标识）；T5 `workbench-body.client.spec.tsx`（在 999 前插入一行后保留展开并显示新文件、刷新失败 COPY-14 保留旧列表、迟到结果丢弃） | 本包测试通过 | TC-11（已通过） |
| AC-06 a～g 空/错状态 | T5 `workbench-body.client.spec.tsx`（a 无工作目录、b 未初始化、c 无 Feature、d 目录缺失、e 首次读取失败并可重试、f 目录读取失败、g 刷新失败）；T3（错误归类）；`face.client.spec.ts`（Host 失败按值传递） | 本包测试通过；（a）（c）～（g）只由开发测试证明 | TC-08：人工抽查 (b)（已通过） |
| AC-07 只读与越界 | T2 `roadmap.client.spec.ts`（越界判断）；T5 `workbench-body.client.spec.tsx`（越界行展开及过滤时不调用列目录回调）；`apply.client.spec.ts`（页面只拿到 `readRoadmap`、`listDirectory` 两个读取回调，底层只调用 stat/read/list）；Web 组合测试（越界行显示目录缺失）；代码评审（无写调用） | 本包测试通过；“越界行不发出读取请求”只由开发测试证明 | TC-03、TC-10（已通过） |
| AC-08 双语文案与语言切换 | T6/T9 `copy.client.spec.ts`（COPY-01～19 zh/en 与 PRD 逐字比对）；T9 `workbench-title.client.spec.tsx`（tab 标题组件按当前语言渲染并随切换变化）；`workbench-body.client.spec.tsx`“names the sections in the current language and follows a language switch”（ROADMAP 分区标题为中文时，分组名先为中文、切换英文字典后为 In progress/Planned/Done，页头变为 SDD workbench）；`apply.client.spec.ts`（tab 标题组件注册到 `sidebar.right.pane.tab.title` 并在卸载时撤回）；Web 组合测试（英文界面打开后在设置中切到中文，断言 tab 标题、页头“SDD 工作台”、分组“进行中 (3)”“规划中 (0)”“已完成 (1)”，Feature 标题仍为 ROADMAP 原文）；`pnpm run check:i18n` | 本包测试通过；Web 组合测试与 `check:i18n` 待核验 | TC-09（T9 后复测通过） |
| AC-09 过滤 | T4 `filter.client.spec.ts`（a～d、多词、组内排序）；T5 `workbench-body.client.spec.tsx`（仅文件命中时自动展开、清空恢复、Escape） | 本包测试通过 | TC-06（已通过） |
| AC-10 a～f 读取数量上限（BR-07、NFR-04、COPY-15/16） | T6b `face.client.spec.ts`、`feature-files.client.spec.ts`、`workbench-body.client.spec.tsx`、`copy.client.spec.ts`（逐项见下表） | 本包测试通过；只由开发测试证明 | 无人工用例（PRD 不要求人工构造大文件）；TC-04 顺带核对正常规模下不出现 COPY-15（已通过） |
| FR-07 按 README 启动 | T7 README（`pnpm run test:docs`）；T8 Web 组合测试（测试专用 overlay `sdd-workbench-panel.overlay.yml` 挂载插件，与 README 的 patch 方式不同） | README 已定稿；`test:docs` 待核验 | TC-01（按 README 启动，已通过） |

Web 组合测试 `apps/web/tests/sdd-workbench-panel.e2e.ts` 的覆盖边界：用测试专用 overlay 挂载插件，构造小型 `mai-specs`（进行中 999/998/997、规划中为空、已完成 990；997 链接到 `mai-specs` 之外），比对 ARIA 基准 `apps/web/tests/snapshots/sdd-workbench-panel/page.expected.md`。覆盖引导页打开、分组与组内编号排序、隐藏文件不列、越界行显示目录缺失、文档预览打开 PRD、已打开页面切换到中文后 tab 标题/页头/分组名变化且 Feature 标题不变。它不覆盖按 README patch 启动、PNG/PDF 预览、刷新、过滤、只读快照，这些由人工用例承担。

### AC-10 开发测试须证明的内容及对应测试（T6b）

预期均取自 PRD BR-07、NFR-04、AC-10、COPY-08/14/15/16 与 UI-01 状态表；请求次数通过注入的读取回调（ROADMAP 的读文件、Feature 的列目录）计数断言。2026-11-21 核对测试源码后填写“对应测试”列；结果依据为本包 133 个测试通过。

| AC-10 | 构造（注入的 Host 应答） | 须断言的结果 | 对应测试（已核实） |
|---|---|---|---|
| （a） | ROADMAP 共 20001 行，分多页返回 | 整页显示 COPY-08，{reason} 为 COPY-16，即“无法读取 ROADMAP：文件超过 2 万行或 2 MB，请检查并精简后刷新”；不显示任何分组或 Feature 行（已读内容丢弃、不解析）；越过 20000 行后不再发出 ROADMAP 读取请求（读取次数不超过读到第 20001 行所需的页数）；显示刷新按钮 | `face.client.spec.ts`“refuses a ROADMAP past the line limit…”（5 页，读取次数恰为 5，后续页不读）；`workbench-body.client.spec.tsx`“refuses an oversized ROADMAP on the first read…”（整句中文、无行、刷新可用） |
| （b） | Host 报告 ROADMAP 大小超过 2 MB | 同（a）的 COPY-08 + COPY-16；得知大小超限后不再发出 ROADMAP 读取请求 | `face.client.spec.ts`“refuses a ROADMAP the Host reports past the byte limit without reading it”（含恰好上限通过）、“refuses a ROADMAP that grew past the byte limit while its pages were read”；Host 不报告大小时“counts the text read in UTF-8 bytes when the Host reports no size”（按已读 UTF-8 字节兜底，恰好上限通过、多 1 字节失败） |
| BR-07（1）补充 | Host 因单页过大拒绝读取（技术方案为 `workspace-file/too-large`） | 按 ROADMAP 超限处理：首次读取显示 COPY-08 + COPY-16，刷新时显示 COPY-14 + COPY-16（PRD 写在 BR-07 中，AC-10 未单列） | `face.client.spec.ts`“treats a page the Host refuses as too large as an oversized ROADMAP”（归为同一超限结果，页面显示由（a）（c）的组件测试覆盖） |
| （c） | 列表已显示后，刷新时 ROADMAP 增长到 20001 行 | 保留上次的列表，顶部显示 COPY-14，{reason} 为 COPY-16，即“刷新失败：文件超过 2 万行或 2 MB，请检查并精简后刷新。显示的是上次的结果”；英文为 “Refresh failed: the file is over 20,000 lines or 2 MB. Check it, trim it, then refresh. Showing the previous results.”；越限后不再发出读取请求；再次刷新成功后提示消失 | `workbench-body.client.spec.tsx`“keeps the list when a refresh finds the ROADMAP oversized, in the current language”（英文整句、保留 999）；读取次数同（a）；提示消失由“keeps the previous list and its listings after a failed refresh, and clears the notice on success”覆盖 |
| 边界 | ROADMAP 恰好 20000 行 | 正常解析显示，不判超限（BR-07“超过”） | `face.client.spec.ts`“reads exactly the line limit” |
| （d） | 某 Feature 目录及其子目录合计 2001 个非 `.` 开头条目（文件与子目录合计），分别在展开与输入能匹配其文件的过滤词两种入口 | 读到第 2001 个条目后不再发出列目录请求（列目录次数有确定上限，不随剩余目录数增长）；列出已读到的文件，其后显示 COPY-15；以 `.` 开头的条目不计数；过滤只在已读到的文件中匹配，过滤视图中该 Feature 同样显示 COPY-15 | `feature-files.client.spec.ts`“stops at the entry past MAX_ENTRIES…”（列目录调用恰为根与 d1，d2 不读）、“stops inside the first directory listing…”、“does not count hidden entries”；`workbench-body.client.spec.tsx`“says an incomplete listing is incomplete below its files, expanded or filtered”（展开与过滤两入口均显示 COPY-15，以不完整清单注入） |
| （e） | 某子目录被 Host 返回为已截断（条目总数未超限） | 列出已读到的文件并显示 COPY-15；展开与过滤两种入口 | `feature-files.client.spec.ts`“marks a listing the Host cut short as incomplete…”；组件测试同（d） |
| （f） | 合计恰好 2000 个条目 | 列出全部文件，不显示 COPY-15 | `feature-files.client.spec.ts`“reads exactly MAX_ENTRIES entries as a complete listing”；`workbench-body.client.spec.tsx`“shows no incomplete note for a complete listing” |
| 文案 | `copy.client.spec.ts` | COPY-15、COPY-16 的 zh/en 与 PRD 逐字一致；COPY-16 英文以小写开头且无句末句号，填入 COPY-08、COPY-14 后与上面整句一致 | `copy.client.spec.ts` 逐字比对；整句由（a）（c）的组件测试断言 |
| NFR-04 | 上述各项 | 请求次数断言即固定上限的证据；每次请求读入的数据量受 Host 分页大小约束，无需另测 | 同上 |

## 待验业务用例

### 执行前准备（AI）

1. 确认被测版本：记录 `git -C "$REPO" rev-parse HEAD` 与 `git status --short`，确认 T2～T8（含 T6b）已完成、开发测试通过。若实现位于其他 worktree，`$REPO` 指向该 worktree，DSH 工作区也指向它。
2. 检查数据冲突：`$REPO/src`、`$REPO/../outside`、`$REPO/mai-specs/acceptance-refresh` 均不存在，ROADMAP 中没有 TMP-A、TMP-B、TMP-AR 行。任一已存在则停下，换用不冲突的名称后再继续。
3. 记录 999 当前所处的 ROADMAP 分区及各分区原有行（2026-11-21 更新时 999 在“进行中”，且是唯一一行；“规划中”“已完成”为空）。TC-02、TC-06、TC-11 的分组、数量与位置预期按此写成；若执行时不同（例如 999 已移到“已完成”或新增了其他 Feature），按 BR-02 以实际分区、行数和编号顺序重新推算预期，并在结果中注明（见待确认 Q2）。
4. 准备数据（快照与备份放在仓库外）：

   ```sh
   REPO="/path/to/deepseek-harness"   # 被测仓库根目录，换成本机实际路径
   F="$REPO/mai-specs/999-sdd-workbench"
   BK="${TMPDIR:-/tmp}/sdd-acceptance"; mkdir -p "$BK"
   git -C "$REPO" status --porcelain=v1 --ignored > "$BK/status-s0.txt"      # 造数前基线，供清理核对
   cp "$REPO/mai-specs/ROADMAP.md" "$BK/ROADMAP.md.orig"
   # AC-03：PNG、PDF 与一个隐藏文件
   mkdir -p "$F/acceptance-samples"
   cp "$REPO/apps/desktop/installer/assets/brand.png" "$F/acceptance-samples/sample.png"
   printf 'SDD workbench acceptance sample PDF\n' > "$BK/sample.txt"
   cupsfilter "$BK/sample.txt" > "$F/acceptance-samples/sample.pdf"
   printf 'hidden sample\n' > "$F/acceptance-samples/.hidden-sample.md"
   # AC-07：越界链接的目标真实存在，用于证明插件没有读取它们
   mkdir -p "$REPO/../outside" "$REPO/src"
   printf '# outside\n' > "$REPO/../outside/BRIEF.md"
   printf '# src\n' > "$REPO/src/BRIEF.md"
   ```

5. 在 `mai-specs/ROADMAP.md` 的“进行中”表格中、999 行**之前**依次加入两行（先 TMP-B 后 TMP-A，使 ROADMAP 行序与编号顺序不同，供 TC-02 核对 BR-02 排序；不动“规划中”表格）：

   ```markdown
   | TMP-B | [验收越界样例乙](../src/BRIEF.md) | standard | P2 | 验收临时数据：mai-specs 之外 |
   | TMP-A | [验收越界样例甲](../../outside/BRIEF.md) | standard | P2 | 验收临时数据：工作目录之外 |
   ```

   临时样例的编号（TMP-A、TMP-B、TMP-AR）不是纯数字，目录名（`acceptance-samples`、`acceptance-refresh`）不以数字开头，链接也不是 `数字-名称/BRIEF.md` 形式。新建需求的脚本 `.claude/skills/my-create-feature/scripts/init-feature.mjs` 从 ROADMAP 编号列中的纯数字、`数字-名称/BRIEF.md` 链接和 `mai-specs/` 下以数字开头的目录推算下一个编号（取最小值减 1），不是 3 位的数字编号会直接报错；用纯数字编号或数字开头的目录会让验收期间或清理不彻底时新建的需求拿到错误编号或失败。该脚本只向“规划中”表格追加行，临时行放在“进行中”也不会与它冲突。

6. 生成 TC-04 的预期文件清单（按 BR-03：隐藏文件不列、`BRIEF.md` 置顶、其余按路径排序）：

   ```sh
   cd "$F" && find . -type f ! -path '*/.*' | sed 's|^\./||' | LC_ALL=C sort | awk '$0=="BRIEF.md"{print;next}{a[n++]=$0}END{for(i=0;i<n;i++)print a[i]}'
   ```

   以编写时的目录推算，结果应为 12 个文件：`BRIEF.md`、`acceptance-samples/sample.pdf`、`acceptance-samples/sample.png`、`context/_INDEX.md`、`context/作业要求.md`、`design/CODE_DESIGN.md`、`design/TECH_DESIGN.html`、`design/TECH_DESIGN.md`、`review/design_review.md`、`review/prd_review.md`、`spec/PRD.md`、`test/TEST_PLAN.md`。执行时以命令输出为准（实施阶段可能新增评审等文档）。2026-11-21 执行时输出为 13 个文件，比上面多 `review/code_review.md`。
7. 按插件 README 构建并启动（编写时已知命令为 `pnpm install && pnpm run build:artifacts`，然后在仓库根目录执行 `pnpm dsh web --patch packages/experimental/sdd-workbench/sdd-workbench.patch.yml`，以 README 为准）。漏写 `--patch` 时插件会静默缺席。
8. 负责人在 DSH Web 中添加指向 `$REPO` 的工作区并在其中新建会话；另保留一个“默认工作区”会话供 TC-08 使用。界面语言先设为中文。
9. 会话建好、尚未点击工作台卡片时，AI 记录只读快照 S1：`git -C "$REPO" status --porcelain=v1 --ignored > "$BK/status-s1.txt"`。从此刻到 TC-10 结束，AI 不在仓库内写任何文件（包括本计划的执行结果）。

### TC-01：从引导页打开 SDD 工作台

- 关联需求：AC-01、FR-01、FR-07
- 前提与数据：执行前准备完成；在指向本仓库的会话中。
- 操作步骤：
  1. 展开右侧栏，查看引导页。
  2. 点击“SDD 工作台”卡片。
  3. 在同一分栏点“+”回到引导页（或新建引导页 tab），再次点击“SDD 工作台”卡片。
- 预期结果：
  1. 引导页显示带图标的卡片，标题“SDD 工作台”，描述“浏览 mai-specs 中的需求与规格”，与“文件”等内置卡片并列。
  2. 当前分栏打开工作台页，tab 标题为“SDD 工作台”。
  3. 切换到已有的工作台 tab，该分栏中工作台 tab 仍只有一个。
- 验证方式与证据：人工；截图引导页卡片和第 3 步后的 tab 栏（或录屏）。
- 清理：无。

### TC-02：真实 ROADMAP 按阶段分组

- 关联需求：AC-02、BR-02、BR-05
- 前提与数据：TC-01 打开的工作台页；ROADMAP 含准备步骤加入的 TMP-A、TMP-B。
- 操作步骤：
  1. 观察页面上的分组与 Feature 行。
- 预期结果：
  1. 分组自上而下为“进行中 (3)”“规划中 (0)”“已完成 (0)”；“规划中”“已完成”无子项。（中文界面下阶段名为 COPY-17～19 中文，与 ROADMAP 分区标题字面相同，2026-11-21 需求变更后此预期不变；TC-06、TC-11 同。）
  2. “进行中”内依次为 999“SDD 工作台：Feature 导航与规格查看”（P1）、TMP-A“验收越界样例甲”（P2）、TMP-B“验收越界样例乙”（P2）：纯数字编号在前，非数字编号在后并按码点顺序，与它们在 ROADMAP 中的行序（TMP-B、TMP-A、999）无关；越界行按 BR-05 仍显示。
  3. 999 标题过长时单行省略。
- 验证方式与证据：人工；截图。执行时分区内容与准备步骤 3 的记录不同时，按该步骤重新推算。
- 清理：无。

### TC-03：越界 Feature 展开显示目录缺失

- 关联需求：AC-07、BR-05、COPY-09
- 前提与数据：TC-02 页面。
- 操作步骤：
  1. 点击 TMP-A 行展开。
  2. 点击 TMP-B 行展开。
  3. 收起 TMP-A；**保持 TMP-B 展开**（供 TC-06 核对展开状态的恢复）。
- 预期结果：
  1. TMP-A 下显示“未找到需求目录 ../../outside/BRIEF.md”，不列出 `$REPO/../outside` 中的任何文件。
  2. TMP-B 下显示“未找到需求目录 ../src/BRIEF.md”，不列出 `$REPO/src` 中的任何文件。
- 验证方式与证据：人工；截图。“越界路径不发出读取请求”无法人工观察，以开发测试为准（见待确认 Q5）。
- 清理：无。

### TC-04：展开 Feature 999 列出全部文件并预览 PNG、PDF

- 关联需求：AC-03、FR-03、FR-04、BR-03；BR-07（正常规模不误报，回归）
- 前提与数据：准备步骤 6 生成的预期清单。
- 操作步骤：
  1. 点击 999 行展开。
  2. 点击 `acceptance-samples/sample.png`。
  3. 回到工作台 tab，点击 `acceptance-samples/sample.pdf`。
  4. 回到工作台 tab，点击 999 行收起，再点击一次展开。
- 预期结果：
  1. 列出的相对路径与预期清单完全一致（数量、顺序），`BRIEF.md` 在第一位；`acceptance-samples/.hidden-sample.md` 和 `.DS_Store` 不出现；列表后不显示 COPY-15“文件过多，列表不完整，请检查并清理无效文件后尝试”（目录远低于 BR-07 的 2000 个条目上限）。
  2. 文档预览中正常显示该图片。
  3. 文档预览中正常显示该 PDF。
  4. 第一次点击收起，文件行消失；再次点击重新展开。最终保持展开，供 TC-05 使用。
- 验证方式与证据：人工；截图展开后的完整列表（列表较长时分段截图）及两份预览。
- 清理：无（样例文件在收尾清理中删除）。

### TC-05：打开 PRD 预览且不重复打开

- 关联需求：AC-04、FR-05
- 前提与数据：999 已展开。
- 操作步骤：
  1. 点击 `spec/PRD.md`。
  2. 回到工作台 tab，再次点击 `spec/PRD.md`。
- 预期结果：
  1. 右侧栏以文档预览打开该文件，标题、表格按 Markdown 格式化显示，而不是原文。
  2. 切换到已打开的 PRD 预览 tab，不新增 tab。
- 验证方式与证据：人工；录屏或第 2 步前后 tab 栏截图。
- 清理：可关闭 TC-04、TC-05 打开的预览 tab。

### TC-06：搜索过滤

- 关联需求：AC-09、FR-08、BR-06、COPY-12
- 前提与数据：完整列表；展开状态为 999 已展开、TMP-B 已展开、TMP-A 已收起，记下这一状态。
- 操作步骤：
  1. 在搜索框输入 `999`。
  2. 清空后输入 `prd`；再清空后输入 `PRD`。
  3. 清空后输入 `不存在的词`。
  4. 清空搜索框（先用删除键，再用一次 Escape 验证 UI-01 的 Escape 清空）。
- 预期结果：
  1. 只显示 Feature 999；“规划中”“已完成”分组隐藏，“进行中”的数量为匹配数 1。
  2. 两次结果相同：只显示 999，自动展开，只列出匹配的文件，即 `review/prd_review.md` 与 `spec/PRD.md`（不断言二者顺序，见待确认 Q6）；TMP-A、TMP-B 不显示。
  3. 显示“没有匹配的需求或文件”。
  4. 恢复 TC-02 的完整列表与过滤前的展开状态（999、TMP-B 展开，TMP-A 收起）。
- 验证方式与证据：人工；每步截图。
- 清理：搜索框保持为空。

### TC-07：树形交互补充（非 AC 门槛）

- 关联需求：PRD UI-01（可访问性与 Feature 行、文件行交互）；PRD 未为其设 AC，本用例结果不影响 AC 结论，只作为问题记录。
- 前提与数据：完整列表。
- 操作步骤：
  1. 鼠标悬停在 999 的标题上；再用 Tab 键把焦点移到 999 行。
  2. 用上下方向键在分组与 Feature 行间移动；在 999 行上按 Enter、再按 Space。
  3. 移到 999 的某个文件行，按 Enter。
  4. 点击刷新按钮，观察刷新期间按钮状态（刷新很快时可能来不及观察）。
- 预期结果：
  1. 标题被省略时，悬停或键盘聚焦显示全文。
  2. 方向键移动焦点；Enter、Space 分别切换展开与收起。
  3. 文档预览打开该文件。
  4. 刷新期间保留当前列表，刷新按钮禁用；结束后列表不变。
- 验证方式与证据：人工；记录观察。
- 清理：恢复 999 展开，关闭新开的预览 tab。

### TC-08：未初始化项目的空状态

- 关联需求：AC-06（b）、COPY-06
- 前提与数据：“默认工作区”会话。AI 根据负责人提供的该工作区路径，确认其下没有 `mai-specs/ROADMAP.md`；若有，改用一个新建的空目录工作区。
- 操作步骤：
  1. 切换到该会话，从右侧栏引导页打开 SDD 工作台。
- 预期结果：显示“未找到 mai-specs/ROADMAP.md。请先在项目中初始化 my-ai-infra”（COPY-06，2026-11-21 起句末无句号）
- 验证方式与证据：人工；截图。（a）（c）～（g）由开发测试覆盖。
- 清理：切回本仓库会话。

### TC-09：中英文界面文案与语言切换

- 关联需求：AC-08、NFR-01、COPY-01～03、COPY-11、COPY-17～19；UI-01“tab 标题”“阶段分组”行（2026-11-21 需求变更）
- 前提与数据：本仓库会话的工作台页已打开（不关闭、不重新打开）；界面语言中文；列表含 999、TMP-A、TMP-B。
- 操作步骤：
  1. 核对中文界面的引导页卡片、tab 标题、页头、分组名、刷新按钮提示（悬停）与搜索框占位文字，记下 Feature 行标题。
  2. **不关闭工作台 tab**，在设置中把界面语言改为英文（入口编写时为“设置 → 语言”，以实际界面为准），回到工作台 tab，重复第 1 步（卡片可在新开引导页中核对）。
  3. 同样不关闭 tab，改回中文，核对 tab 标题、页头、分组名恢复中文。
- 预期结果：
  1. 中文：卡片标题、tab 标题、页头为“SDD 工作台”；卡片描述“浏览 mai-specs 中的需求与规格”；分组为“进行中 (3)”“规划中 (0)”“已完成 (0)”；刷新按钮“刷新”；搜索框“按编号、标题或文件名过滤”。
  2. 英文：已打开页面无需重新打开即更新，tab 标题与页头为“SDD workbench”，分组为“In progress (3)”“Planned (0)”“Done (0)”（ROADMAP 中文分区标题只用于识别，不直接显示）；卡片“SDD workbench”“Browse features and specs in mai-specs”；刷新“Refresh”；搜索框“Filter by number, title, or file name”。Feature 标题（如 999“SDD 工作台：Feature 导航与规格查看”、TMP-A“验收越界样例甲”）与第 1 步相同，不翻译。
  3. 改回中文后 tab 标题、页头、分组名恢复为第 1 步的中文，Feature 标题不变。
- 验证方式与证据：人工；两种语言各截图（含 tab 栏）。自动化证据见“已有测试覆盖”AC-08 行。
- 清理：界面语言恢复中文。

### TC-10：只读核对（快照比对）

- 关联需求：AC-07、BR-04
- 前提与数据：TC-01～TC-09 已完成，期间 AI 未在仓库内写文件。
- 操作步骤：
  1. AI 记录 S2：`git -C "$REPO" status --porcelain=v1 --ignored > "$BK/status-s2.txt"`，执行 `diff "$BK/status-s1.txt" "$BK/status-s2.txt"`。
  2. AI 确认 `$REPO/../outside/` 下只有 `BRIEF.md`。
- 预期结果：两份快照一致；`outside` 目录无新增内容。若出现差异，逐项判断是否由插件造成（例如 DSH 运行缓存落在已忽略目录中），由插件造成即判失败。
- 验证方式与证据：AI 执行命令；保留两份快照与 diff 输出。代码评审另行核对无写入调用。
- 清理：无。

### TC-11：刷新反映磁盘变化（含在 999 之前插入一行）

- 关联需求：AC-05、FR-06、BR-02；覆盖[方案评审 F1](../review/design_review.md) 要求的“在 999 之前插入一行”
- 前提与数据：本仓库会话的工作台页，搜索框为空，999、TMP-B 已展开，TMP-A 已收起（TC-06 恢复后的状态）。
- 操作步骤：
  1. AI 改动磁盘：

     ```sh
     printf '# refresh sample\n' > "$F/context/refresh-sample.md"
     mkdir -p "$REPO/mai-specs/acceptance-refresh"
     printf '# refresh sample\n' > "$REPO/mai-specs/acceptance-refresh/BRIEF.md"
     ```

     并在 ROADMAP“进行中”表格中、999 行**之前**（即 TMP-A 与 999 之间）插入：

     ```markdown
     | TMP-AR | [刷新验收样例](acceptance-refresh/BRIEF.md) | standard | P2 | 验收临时数据 |
     ```

     编号 `TMP-AR` 按码点排在 TMP-A 与 TMP-B 之间，使已展开的 TMP-B 在界面中下移一位；ROADMAP 中插在 999 之前，使 999 的行序也发生变化。

  2. 负责人点击页内刷新按钮。
  3. 观察后，点击 TMP-AR 行（若已展开则观察其内容）。
- 预期结果：
  1. “进行中 (4)”内依次为 999、TMP-A、TMP-AR“刷新验收样例”、TMP-B（按 BR-02 编号顺序，而不是 ROADMAP 行序）；“规划中 (0)”“已完成 (0)”不变。
  2. 999 保持展开，`context/refresh-sample.md` 出现在 `context/_INDEX.md` 与 `context/作业要求.md` 之间，其余文件不变；TMP-B 仍展开并显示 COPY-09，TMP-A 仍收起。
  3. TMP-AR 展开后只列出 `BRIEF.md`，不出现 999 的任何文件；999 的列表也不混入 TMP-AR 的文件。记录刷新后 TMP-AR 的初始展开状态（PRD 未规定）。
- 验证方式与证据：人工；刷新前后截图或录屏。
- 清理：见收尾清理。

### 收尾清理（AI）

1. 停止 DSH 后删除测试数据：

   ```sh
   rm -rf "$F/acceptance-samples" "$F/context/refresh-sample.md" "$REPO/mai-specs/acceptance-refresh"
   rm -f "$REPO/src/BRIEF.md" && rmdir "$REPO/src"
   rm -f "$REPO/../outside/BRIEF.md" && rmdir "$REPO/../outside"
   diff "$BK/ROADMAP.md.orig" "$REPO/mai-specs/ROADMAP.md"
   ```

2. ROADMAP：diff 只显示 TMP-A、TMP-B、TMP-AR 三行新增时，执行 `cp "$BK/ROADMAP.md.orig" "$REPO/mai-specs/ROADMAP.md"`；还有其他差异时说明执行期间有人改过 ROADMAP，只手工删除这三行。
3. 核对：`git -C "$REPO" status --porcelain=v1 --ignored | diff "$BK/status-s0.txt" -`，应无差异。
   再确认 ROADMAP 与 `mai-specs/` 中不再有任何 TMP 行或验收目录：`grep -n 'TMP-' "$REPO/mai-specs/ROADMAP.md"` 无输出，`ls "$REPO/mai-specs"` 与造数前一致。
4. 把执行结果写入本计划“执行结果”节，删除 `$BK`。

## 待确认与补齐事项

| 编号 | 问题 | 影响 | 建议 |
|---|---|---|---|
| Q1 | AC-03 写“展开显示全部 6 个文件”，按 4 个原有文件加 PNG、PDF 计算。目前 999 目录已有 10 个非隐藏文件（含本计划），加样例后为 12 个，且实施中可能继续增加 | AC-03 文字已过时 | 已处理：PRD AC-03 已改为与执行时按 BR-03 生成的预期清单比对（2026-11-21 用户确认） |
| Q2 | AC-02 人工核对写“Feature 999 显示在‘规划中 (1)’”，依赖 999 在执行时仍处于规划中；进入开发或提测后 my-ai-infra 可能把该行移到“进行中” | AC-02 人工核对可能与实际状态不符 | 已处理：PRD AC-02 已改为与验收时 ROADMAP 的分区和数量比对（2026-11-21 用户确认）。999 已于 2026-11-21 移到“进行中”，TC-02、TC-06、TC-11 已按此更新；执行时仍按准备步骤 3 核对 |
| Q3 | AC-01 要求“带图标的卡片”，技术方案 K5 决定使用引导页默认占位图标并称已满足，但 PRD 原文未注明占位图标可接受 | AC-01 判定 | 已处理：PRD AC-01 已注明默认占位图标即满足（2026-11-21 用户确认） |
| Q4 | AC-07 要求“在提交干净的工作区中进行，前后 `git status --ignored` 一致”。当前工作区有未提交改动（`.gitignore`、`AGENTS.md`、`CLAUDE.md`、PRD、`.my-ai-infra.json`），造数本身也会产生未跟踪文件 | “提交干净”无法同时满足 | 已处理：PRD AC-07 已改为造数后快照比对，即本计划的 S1/S2（2026-11-21 用户确认） |
| Q5 | AC-07“越界行展开时不发出读取请求”无法通过界面人工观察 | 只能由开发测试证明 | 已处理：技术方案 T5 已补该组件测试 |
| Q6 | BR-06 未规定过滤状态下匹配文件的排列顺序；AC-09（a）未规定编号命中时 999 是否展开 | TC-06 不断言这两点 | 如需判定，请在 PRD 中补充 |
| Q7 | BR-03 的“字典序”未说明按码点还是按语言习惯排序；“隐藏文件”是否包括隐藏目录未说明 | 文件名大小写混排或含隐藏目录时预期不唯一 | 已处理：PRD BR-03 已明确码点顺序，以 `.` 开头的目录同样不列出（2026-11-21 用户确认） |
| Q8 | AC-01 要求按插件 README 启动，README 属于 T7，尚未编写 | TC-01 启动命令 | 执行时以 README 为准，并核对其中是否写明漏写 `--patch` 会导致插件缺席（技术方案风险表）。2026-11-21 更新：README 草稿已在工作区（未提交），已写明启动命令与漏写 `--patch` 时页面静默缺席；T7 定稿后以定稿为准。2026-11-21 更新：已处理，README 已定稿（`packages/experimental/sdd-workbench/README.md` 及中文版），写明 `pnpm dsh web --patch packages/experimental/sdd-workbench/sdd-workbench.patch.yml` 与漏写 `--patch` 时页面静默缺席；TC-01 按此启动通过 |
| Q9 | AC-06（a）“会话无工作目录”在 DSH Web 中能否构造未知 | 无法人工验证（a） | PRD 只要求人工抽查（b），（a）依赖开发测试 |
| Q10 | 开发测试 T2～T8 均未编写，没有任何当前通过结果 | 全部 AC 的自动化部分 | 实施完成并通过后才开始执行本计划。2026-11-21 更新：T2～T6 测试已编写，T6b（AC-10）未编写，仍未见当前通过结果；`copy.client.spec.ts` 在 T6b 补 COPY-15/16 映射前预期失败。2026-11-21 更新：已处理，T2～T9 的开发测试已全部编写，主 Agent 在被测版本上运行本包 133 个测试通过、`src/**` 逐文件 100% 覆盖率；`copy.client.spec.ts` 已映射 COPY-01～19。Web 组合测试等其他入口见 Q17 |
| Q11 | 验收临时样例的编号不能是纯数字（避免干扰新建需求脚本的编号推算），而 BR-02 规定非数字编号排在所有数字编号之后，因此真实数据验收无法构造“新 Feature 排到已有数字编号 Feature 之前”（即“最新的 Feature 在最上面”）的场景；数值比较（如 `99` 在 `100` 之前）也无法用真实数据验证 | AC-02、AC-05 的人工部分只能验证非数字编号的码点排序、数字在前和不按行序显示；数字编号之间的排序只由 T2 单元测试证明 | 已处理：用户选择以 T2 单元测试（按编号排序、数值优先再码点、插入行按编号就位）在被测版本上的通过结果为证据，不另做人工验证（2026-11-21） |
| Q12 | BR-07“2 MB”未说明按 2×1024×1024 字节还是 2,000,000 字节；ROADMAP 行数如何计（末尾换行是否算一行）也未说明 | AC-10（b）及 20000/20001 行边界的构造 | 开发测试按技术方案 K8 的取值构造；如需唯一判定，请在 PRD 中注明 |
| Q13 | AC-10 只为 Feature 条目给出“恰好 2000”的边界（f），没有 ROADMAP“恰好 20000 行”的边界；Host 因单页过大拒绝读取写在 BR-07 中，但 AC-10 未单列 | 这两项没有 AC 可判 | 本计划按 BR-07 的“超过”把它们列为 T6b 须证明的补充项（技术方案 T6b 已包含）；不阻塞 |
| Q14 | BR-07 说“过滤时同样适用，只在已读到的文件中匹配”，但未写过滤视图中是否显示 COPY-15；若不完整 Feature 的已读文件都不匹配，该 Feature 被隐藏，用户看不到“不完整”提示 | 过滤场景下 COPY-15 的判定 | 本计划按技术方案 T6b 写为“过滤视图中同样显示 COPY-15”；已读文件全部未匹配时是否提示，PRD 未规定，不断言。需要时请在 PRD 中补充 |
| Q15 | AC-10（d）只规定显示“已读到的文件”，未规定遍历顺序，超限时具体列出哪些文件不唯一；UI-01 也未规定子目录读取失败（COPY-13）与清单不完整（COPY-15）同时出现时的优先级 | （d）的列表内容；失败与截断并存时的显示 | 开发测试只断言列出的文件都来自已读条目、显示 COPY-15；并存时按技术方案 T6b（记为读取失败）。PRD 未规定，不作为业务验收项 |
| Q16 | PRD 头部仍写“增补读取数量上限……待技术方案同步”，而技术方案已含 K8/T6b 并完成增量评审 | 仅状态描述过时 | 由 PRD 负责人顺手更新状态，不影响本计划。2026-11-21 更新：已处理，PRD 头部已写明技术方案已同步并完成增量评审，并记录验收后修订 |
| Q17 | Web 组合测试 `apps/web/tests/sdd-workbench-panel.e2e.ts`、`pnpm run check:i18n`、`pnpm run test:docs` 在被测版本（含 T9 修改）上的运行结果未随本次交接提供 | AC-08 语言切换的真实组合证据、其余 6 种语言字典键齐全、README 文档检查 | 已处理（2026-11-21）：主 Agent 在被测版本上运行，结果见“已有测试覆盖”的当前结果依据，均通过 |

执行条件：DSH Web 可启动且带插件；有指向被测仓库的工作区及会话、一个无 `mai-specs` 的会话；macOS 自带 `cupsfilter` 用于生成 PDF 样例（不可用时改用任意小 PDF）；执行期间不并行修改 `mai-specs/ROADMAP.md`。

## 执行结果

### 2026-11-21 业务验收

- **被测版本**：提交《处理 SDD 工作台代码评审：ROADMAP 已读字节兜底上限、补记快照豁免决定》（2026-11-21）加工作区未提交的 T9 修改（`WorkbenchTitle.tsx`、`WorkbenchBody.tsx`、`locales.ts`、`index.ts`、对应测试、Web 组合测试与 ARIA 基准，以及 PRD/技术方案/README 的同步修改）。TC-09 首次执行在 T9 之前，复测在 T9 之后；其余用例结果不受 T9 影响（T9 只改语言相关显示，中文界面下分组名字面不变）。
- **环境**：本机 DSH Web，按插件 README 带 patch 启动；工作区指向本仓库，另有无 `mai-specs` 的“默认工作区”会话；界面语言中文（TC-09 切换英文后恢复）。
- **执行者**：需求负责人 austin 人工操作界面；AI 负责造数、快照比对与清理。
- **范围**：TC-01～TC-11 与收尾清理。与计划的偏差：快照与备份放在会话临时目录，而不是计划中的 `$TMPDIR/sdd-acceptance`，清理后不再保留，下文结论依据执行时的命令输出与人工观察。

| 用例 / 已有测试引用 | 结果 | 实际观察与证据 | 问题或复验事项 |
|---|---|---|---|
| TC-01（AC-01、FR-07） | 通过 | 按 README 启动，引导页卡片、打开、分栏内去重符合预期 | — |
| TC-02（AC-02） | 通过 | 分组、数量与组内编号顺序符合预期 | — |
| TC-03（AC-07 越界） | 通过 | TMP-A、TMP-B 显示目录缺失，未列出越界目录文件 | — |
| TC-04（AC-03） | 通过 | 实际预期清单为 13 个文件（比编写时多 `review/code_review.md`），页面列出的与之一致；PNG、PDF 预览正常；未出现 COPY-15 | — |
| TC-05（AC-04） | 通过 | PRD 格式化预览，再次点击切换到已有 tab | — |
| TC-06（AC-09） | 通过 | 过滤、无匹配、清空恢复展开状态符合预期 | — |
| TC-07（UI-01，非 AC 门槛） | 通过 | 悬停/聚焦显示全文、方向键与 Enter/Space、刷新期间保留列表符合用例预期 | 代码评审 P2-3（树形键盘导航只实现 APG 基本子集）已由用户决定延后，见[代码评审记录](../review/code_review.md) |
| TC-08（AC-06（b）） | 通过 | 显示 COPY-06 | — |
| TC-09（AC-08）首次 | 失败 | 切换英文后 tab 标题仍为“SDD 工作台”（缺陷：侧边栏保存打开 tab 时的标题字符串）；分组名显示 ROADMAP 原文 | 用户随即决定分组名按界面语言显示，属需求变更（PRD 变更记录 2026-11-21 最后一行）；由技术方案 T9 修复 |
| TC-09（AC-08）T9 后复测 | 通过 | 用户按更新后的 TC-09 复测：已打开页面切换语言后 tab 标题、页头、分组名随之变化，Feature 标题不变 | — |
| 观察项（非 AC） | 记录，暂不处理 | 选中或悬停的 tab 上，关闭按钮盖住标题“SDD 工作台”末尾。原因在 ui-dockkit 共用规则 `packages/client/ui-dockkit/src/components/dockkit.module.css` 的 `.tab`/`.tabTitle`：tab 宽 80～170px，关闭按钮显示时叠在标题最后 14px 上并渐隐 | 用户决定暂不处理；属共用组件行为，不是本插件缺陷 |
| TC-10（AC-07 只读） | 通过 | S1、S2 两份 `git status --porcelain=v1 --ignored` 快照完全一致；`../outside/` 下只有 `BRIEF.md` | — |
| TC-11（AC-05） | 通过 | 刷新后分组、排序、展开状态与新文件符合预期；刷新后 TMP-AR 初始为收起（PRD 未规定，仅记录） | — |
| 收尾清理 | 完成 | ROADMAP 从备份还原，还原前 diff 只有三行 TMP；验收样例与临时目录均已删除。与造数前 S0 相比只多被 git 忽略的 `.dsh-build/`：它在 S1 之前已出现（启动前运行 `build:artifacts` 产生），S1→S2 无变化，判定与插件无关 | 快照与备份已随会话临时目录删除 |
| 开发测试（本包） | 通过 | 主 Agent 在被测版本运行：133 个通过，`src/**` 逐文件 100% 覆盖率 | — |
| Web 组合测试、`check:i18n`、`test:docs` | 通过 | Web 组合测试 3 个通过；`check:i18n` 退出 0；`test:docs` 除范围外未跟踪的 `mai-specs/README.md` 外全部通过 | 见 Q17 |

### 验收结论

本次范围 AC-01～AC-10 均有通过证据，业务验收通过；Q17 所列入口已补跑并通过。

| AC | 结论 | 证据 |
|---|---|---|
| AC-01 | 通过 | TC-01；`apply.client.spec.ts` |
| AC-02 | 通过 | TC-02；T2、T5 测试（数字编号之间的排序只由 T2 证明，见 Q11） |
| AC-03 | 通过 | TC-04；T3、T5 测试 |
| AC-04 | 通过 | TC-05；T5 测试 |
| AC-05 | 通过 | TC-11；T2、T5 测试 |
| AC-06 | 通过 | （b）由 TC-08 人工证明；（a）（c）～（g）只由 `workbench-body.client.spec.tsx` 等开发测试证明（（a）无法在 DSH Web 构造，见 Q9） |
| AC-07 | 通过 | 只读由 TC-10 快照比对与代码评审证明，越界显示由 TC-03 证明；“越界行不发出读取请求”只由开发测试证明（见 Q5） |
| AC-08 | 通过 | TC-09 T9 后复测；`copy.client.spec.ts`、`workbench-title.client.spec.tsx`、`workbench-body.client.spec.tsx`、`apply.client.spec.ts`；其余 6 种语言不在验收范围（NFR-01） |
| AC-09 | 通过 | TC-06；T4、T5 测试 |
| AC-10 | 通过 | 只由 T6b 开发测试证明（PRD 不要求人工构造大文件）；TC-04 仅证明正常规模下不误报 COPY-15 |
