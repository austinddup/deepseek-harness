# 业务测试计划：999 SDD 工作台

[返回需求简报](../BRIEF.md)

> Profile：standard | 模板：`mai-specs/_templates/TEST_PLAN.tmpl.md` | 有效需求来源：[PRD](../spec/PRD.md)（2026-11-20 版本，AC-01～AC-09） | 编写基线：`feat/sdd-workbench` @ `78ef864d37`（T1 已完成，T2～T8 未实现） | 状态：仅规划，未执行

## 范围与依据

- **验收对象**：DSH Web 右侧栏插件“SDD 工作台”，范围为 PRD FR-01～FR-08 与 AC-01～AC-09。预期结果一律取自 [PRD](../spec/PRD.md) 的 AC、BR、COPY 与 UI-01 状态表；[技术方案](../design/TECH_DESIGN.md)和[方案评审](../review/design_review.md)只用于确认启动方式、数据根和开发阶段计划写的测试。
- **执行方式**：需求负责人在 DSH Web 中按下文顺序从 TC-01 走到 TC-11；AI 只负责准备、改动和清理测试数据，以及前后快照比对。用例顺序有依赖：AC-07 的只读快照窗口覆盖 TC-01～TC-09，必须在 TC-11（AC-05，验收者主动改磁盘）之前结束。
- **执行前提**：T2～T8 完成且开发测试通过，插件 README（T7）已写好。当前基线下只有 T1 骨架，本计划不能执行。
- **不在本计划内**：解析、文件清单、过滤、状态机、文案字典等由开发阶段自动测试覆盖的断言（见下表），不再写成人工用例；其余 6 种发布语言（PRD NFR-01 明确不在验收范围）；Mermaid 与相对链接等文档预览自身的渲染细节（AC-04 已排除）。

## 已有测试覆盖

开发测试均为技术方案第 5 节的**计划项，尚未编写，当前没有任何通过结果**。执行验收前须先确认它们已实现并在被测版本上通过。

| 需求 / 业务行为 | 已有测试或入口（计划） | 覆盖范围及结果依据 | 仍需补验的部分 |
|---|---|---|---|
| AC-01 入口注册 | T5 组件测试（注册与 HMR 卸载） | 未编写 | TC-01：真实启动、卡片、分栏内去重 |
| AC-02 分组与无效行 | T2 `roadmap.client.spec.ts` | 未编写；覆盖构造数据（五列/四列、无效行、缺失分区） | TC-02：真实 ROADMAP 显示 |
| AC-03 文件清单 | T3 单元测试（排序、隐藏文件、错误归类、深度上限） | 未编写 | TC-04：真实目录、PNG/PDF 预览、收起 |
| AC-04 打开预览 | T5 组件测试（打开调用参数） | 未编写 | TC-05：真实渲染与资源 tab 去重 |
| AC-05 刷新 | T5 组件测试（保留展开、在 999 前插入一行、刷新失败 COPY-14） | 未编写 | TC-11：真实磁盘改动后刷新 |
| AC-06 a～g 空/错状态 | T3、T5 | 未编写 | TC-08：人工抽查 (b) |
| AC-07 只读与越界 | T2（越界判断）；代码评审（无写调用） | 未编写；**缺口见下** | TC-03、TC-10 |
| AC-08 双语文案 | T6 文案比对测试；`pnpm run check:i18n` | 未编写 | TC-09：人工切换语言抽查 |
| AC-09 过滤 | T4 单元测试；T5（过滤态展开） | 未编写 | TC-06：真实数据抽查 |
| FR-07 按 README 启动 | T7（`pnpm run test:docs`）；T8 视情况补真实组合测试 | 未编写 | TC-01 |

## 待验业务用例

### 执行前准备（AI）

1. 确认被测版本：记录 `git -C "$REPO" rev-parse HEAD` 与 `git status --short`，确认 T2～T8 已完成、开发测试通过。若实现位于其他 worktree，`$REPO` 指向该 worktree，DSH 工作区也指向它。
2. 检查数据冲突：`$REPO/src`、`$REPO/../outside`、`$REPO/mai-specs/acceptance-refresh` 均不存在，ROADMAP 中没有 TMP-R～TMP-B 行。任一已存在则停下，换用不冲突的名称后再继续。
3. 记录 999 当前所处的 ROADMAP 分区（编写时为“规划中”）。若已移到其他分区，TC-02 的预期按实际分区和该组行数调整，并在结果中注明（见待确认 Q2）。
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

5. 在 `mai-specs/ROADMAP.md` 的“进行中”表格末尾加入两行（不动“规划中”，以免改变 AC-02 的计数）：

   ```markdown
   | TMP-A | [验收越界样例甲](../../outside/BRIEF.md) | standard | P2 | 验收临时数据：工作目录之外 |
   | TMP-B | [验收越界样例乙](../src/BRIEF.md) | standard | P2 | 验收临时数据：mai-specs 之外 |
   ```

   临时样例的编号（TMP-A、TMP-B、TMP-R）和目录名（`acceptance-refresh`）都不以数字开头。新建需求的脚本按 ROADMAP 编号列中的纯数字和 `mai-specs/` 下以数字开头的目录推算下一个编号，用纯数字编号会让验收期间新建的需求拿到错误编号。

6. 生成 TC-04 的预期文件清单（按 BR-03：隐藏文件不列、`BRIEF.md` 置顶、其余按路径排序）：

   ```sh
   cd "$F" && find . -type f ! -path '*/.*' | sed 's|^\./||' | LC_ALL=C sort | awk '$0=="BRIEF.md"{print;next}{a[n++]=$0}END{for(i=0;i<n;i++)print a[i]}'
   ```

   以编写时的目录推算，结果应为 12 个文件：`BRIEF.md`、`acceptance-samples/sample.pdf`、`acceptance-samples/sample.png`、`context/_INDEX.md`、`context/作业要求.md`、`design/CODE_DESIGN.md`、`design/TECH_DESIGN.html`、`design/TECH_DESIGN.md`、`review/design_review.md`、`review/prd_review.md`、`spec/PRD.md`、`test/TEST_PLAN.md`。执行时以命令输出为准（实施阶段可能新增评审等文档）。
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
  1. 分组自上而下为“进行中 (2)”“规划中 (1)”“已完成 (0)”；“已完成”无子项。
  2. “进行中”内依次为 TMP-A“验收越界样例甲”、TMP-B“验收越界样例乙”，优先级 P2（越界行按 BR-05 仍显示）。
  3. “规划中”内为 999“SDD 工作台：Feature 导航与规格查看”，优先级 P1；标题过长时单行省略。
- 验证方式与证据：人工；截图。若 999 已不在“规划中”，按准备步骤 3 的记录判断。
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

- 关联需求：AC-03、FR-03、FR-04、BR-03
- 前提与数据：准备步骤 6 生成的预期清单。
- 操作步骤：
  1. 点击 999 行展开。
  2. 点击 `acceptance-samples/sample.png`。
  3. 回到工作台 tab，点击 `acceptance-samples/sample.pdf`。
  4. 回到工作台 tab，点击 999 行收起，再点击一次展开。
- 预期结果：
  1. 列出的相对路径与预期清单完全一致（数量、顺序），`BRIEF.md` 在第一位；`acceptance-samples/.hidden-sample.md` 和 `.DS_Store` 不出现。
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
  1. 只显示 Feature 999；“进行中”“已完成”分组隐藏，“规划中”的数量为匹配数 1。
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
- 预期结果：显示“未找到 mai-specs/ROADMAP.md。请先在项目中初始化 my-ai-infra。”
- 验证方式与证据：人工；截图。（a）（c）～（g）由开发测试覆盖。
- 清理：切回本仓库会话。

### TC-09：中英文界面文案

- 关联需求：AC-08、NFR-01
- 前提与数据：本仓库会话的工作台页；界面语言中文。
- 操作步骤：
  1. 核对中文界面的引导页卡片、tab 标题、页头、刷新按钮提示（悬停）与搜索框占位文字。
  2. 在设置中把界面语言改为英文（入口编写时为“设置 → 语言”，以实际界面为准），重复第 1 步。
  3. 改回中文。
- 预期结果：
  1. 中文：卡片标题、tab 标题、页头为“SDD 工作台”；卡片描述“浏览 mai-specs 中的需求与规格”；刷新按钮“刷新”；搜索框“按编号、标题或文件名过滤”。
  2. 英文：“SDD workbench”；“Browse features and specs in mai-specs”；“Refresh”；“Filter by number, title, or file name”。分组标题仍显示 ROADMAP 原文分区名（COPY-04）。
- 验证方式与证据：人工；两种语言各截图。
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

- 关联需求：AC-05、FR-06；覆盖[方案评审 F1](../review/design_review.md) 要求的“在 999 之前插入一行”
- 前提与数据：本仓库会话的工作台页，搜索框为空，999 已展开。
- 操作步骤：
  1. AI 改动磁盘：

     ```sh
     printf '# refresh sample\n' > "$F/context/refresh-sample.md"
     mkdir -p "$REPO/mai-specs/acceptance-refresh"
     printf '# refresh sample\n' > "$REPO/mai-specs/acceptance-refresh/BRIEF.md"
     ```

     并在 ROADMAP“规划中”表格中、999 行**之前**插入：

     ```markdown
     | TMP-R | [刷新验收样例](acceptance-refresh/BRIEF.md) | standard | P2 | 验收临时数据 |
     ```

  2. 负责人点击页内刷新按钮。
  3. 观察后，点击 TMP-R 行（若已展开则观察其内容）。
- 预期结果：
  1. “规划中 (2)”内依次为 TMP-R“刷新验收样例”、999；“进行中 (2)”不变。
  2. 999 保持展开，`context/refresh-sample.md` 出现在 `context/_INDEX.md` 与 `context/作业要求.md` 之间，其余文件不变。
  3. TMP-R 展开后只列出 `BRIEF.md`，不出现 999 的任何文件；999 的列表也不混入 TMP-R 的文件。记录刷新后 TMP-R 的初始展开状态（PRD 未规定）。
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

2. ROADMAP：diff 只显示 TMP-A、TMP-B、TMP-R 三行新增时，执行 `cp "$BK/ROADMAP.md.orig" "$REPO/mai-specs/ROADMAP.md"`；还有其他差异时说明执行期间有人改过 ROADMAP，只手工删除这三行。
3. 核对：`git -C "$REPO" status --porcelain=v1 --ignored | diff "$BK/status-s0.txt" -`，应无差异。
   再确认 ROADMAP 与 `mai-specs/` 中不再有任何 TMP 行或验收目录：`grep -n 'TMP-' "$REPO/mai-specs/ROADMAP.md"` 无输出，`ls "$REPO/mai-specs"` 与造数前一致。
4. 把执行结果写入本计划“执行结果”节，删除 `$BK`。

## 待确认与补齐事项

| 编号 | 问题 | 影响 | 建议 |
|---|---|---|---|
| Q1 | AC-03 写“展开显示全部 6 个文件”，按 4 个原有文件加 PNG、PDF 计算。目前 999 目录已有 10 个非隐藏文件（含本计划），加样例后为 12 个，且实施中可能继续增加 | AC-03 文字已过时 | 已处理：PRD AC-03 已改为与执行时按 BR-03 生成的预期清单比对（2026-11-21 用户确认） |
| Q2 | AC-02 人工核对写“Feature 999 显示在‘规划中 (1)’”，依赖 999 在执行时仍处于规划中；进入开发或提测后 my-ai-infra 可能把该行移到“进行中” | AC-02 人工核对可能与实际状态不符 | 已处理：PRD AC-02 已改为与验收时 ROADMAP 的分区和数量比对（2026-11-21 用户确认） |
| Q3 | AC-01 要求“带图标的卡片”，技术方案 K5 决定使用引导页默认占位图标并称已满足，但 PRD 原文未注明占位图标可接受 | AC-01 判定 | 已处理：PRD AC-01 已注明默认占位图标即满足（2026-11-21 用户确认） |
| Q4 | AC-07 要求“在提交干净的工作区中进行，前后 `git status --ignored` 一致”。当前工作区有未提交改动（`.gitignore`、`AGENTS.md`、`CLAUDE.md`、PRD、`.my-ai-infra.json`），造数本身也会产生未跟踪文件 | “提交干净”无法同时满足 | 已处理：PRD AC-07 已改为造数后快照比对，即本计划的 S1/S2（2026-11-21 用户确认） |
| Q5 | AC-07“越界行展开时不发出读取请求”无法通过界面人工观察 | 只能由开发测试证明 | 已处理：技术方案 T5 已补该组件测试 |
| Q6 | BR-06 未规定过滤状态下匹配文件的排列顺序；AC-09（a）未规定编号命中时 999 是否展开 | TC-06 不断言这两点 | 如需判定，请在 PRD 中补充 |
| Q7 | BR-03 的“字典序”未说明按码点还是按语言习惯排序；“隐藏文件”是否包括隐藏目录未说明 | 文件名大小写混排或含隐藏目录时预期不唯一 | 已处理：PRD BR-03 已明确码点顺序，以 `.` 开头的目录同样不列出（2026-11-21 用户确认） |
| Q8 | AC-01 要求按插件 README 启动，README 属于 T7，尚未编写 | TC-01 启动命令 | 执行时以 README 为准，并核对其中是否写明漏写 `--patch` 会导致插件缺席（技术方案风险表） |
| Q9 | AC-06（a）“会话无工作目录”在 DSH Web 中能否构造未知 | 无法人工验证（a） | PRD 只要求人工抽查（b），（a）依赖开发测试 |
| Q10 | 开发测试 T2～T8 均未编写，没有任何当前通过结果 | 全部 AC 的自动化部分 | 实施完成并通过后才开始执行本计划 |

执行条件：DSH Web 可启动且带插件；有指向被测仓库的工作区及会话、一个无 `mai-specs` 的会话；macOS 自带 `cupsfilter` 用于生成 PDF 样例（不可用时改用任意小 PDF）；执行期间不并行修改 `mai-specs/ROADMAP.md`。
