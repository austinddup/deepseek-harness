---
description: "实验性右侧边栏页面：按 ROADMAP 阶段列出工作区 mai-specs 目录中的 my-ai-infra 需求，并在文档预览中只读打开其规格文件。"
kind: "package-reference"
---

# @deepseek-ai/dsh-sdd-workbench

[English](README.md) | 中文

## 概述

在 Web 右侧边栏新增「SDD 工作台」页面。它读取会话工作区中的 `mai-specs/ROADMAP.md`，按 ROADMAP 的阶段分区列出需求，编号最新的排在最前。展开需求可查看其文件，点击文件在文档预览中打开，也可按编号、标题或文件名过滤。页面从不写文件，也不向模型注册任何内容。只有用本包的 patch 文件启动 DSH 时才会加载。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

先构建一次仓库，再带上本包的 patch 文件启动 Web 应用，然后在工作区为包含 `mai-specs/` 的项目的会话中打开页面。

### 何时选择它

项目按 my-ai-infra 创建的布局（`mai-specs/ROADMAP.md` 加每个需求一个目录）保存需求，而你想不离开 DSH 就跟进进度、阅读规格时，选用本包。其他目录布局请用右侧边栏的「文件」页；需要修改规格时请用编辑器。

### 带页面启动 DSH

在仓库根目录运行以下命令。构建会生成浏览器加载的 Client bundle；修改本包源码后需重新构建。

```sh
pnpm install
pnpm run build:artifacts
pnpm dsh web --patch packages/experimental/sdd-workbench/sdd-workbench.patch.yml
```

务必保留 `--patch` 参数。漏掉它时 DSH 照常启动，但页面会静默缺席。若想不启动服务就检查组合，在同一命令行中把 `web` 换成 `--profile web` 并加上 `--dump-config`：

```sh
pnpm dsh --profile web --patch packages/experimental/sdd-workbench/sdd-workbench.patch.yml --dump-config
```

输出的最后一段来自 patch 文件，其中包含 `id: sdd-workbench` 这一行。只改了本包时，`pnpm --filter @deepseek-ai/dsh-sdd-workbench bundle` 比完整构建更快地重建其 Client bundle；刷新浏览器页面即可使用。

### 在正确的工作区打开页面

1. 在 Web 应用中，用左侧边栏的 **添加工作区** 添加项目目录，并在该工作区中新建会话。默认工作区中的新会话没有 `mai-specs/` 目录，会显示「未找到 mai-specs/ROADMAP.md」。
2. 打开右侧边栏。引导页上有 **SDD 工作台** 卡片，点击即在该分栏打开页面。
3. 展开需求即列出其文件，点击文件在文档预览中打开。在过滤框中输入以缩小列表，按 Escape 清空。
4. 磁盘上的文件变化后点刷新按钮。页面不监听目录变化。

### 最小配置

patch 文件插入一行；本包没有配置字段。

```yaml
- insert:
    - id: sdd-workbench
      name: './src/index.ts'
```

相对的 `name` 以 patch 文件所在目录解析，因此在任何工作目录下运行都有效。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

Host 入口为空，所有工作都在浏览器中完成。Client 入口在右侧边栏注册一个页面类型，并交给页面两个绑定到其会话的读取操作：一个先通过 `remote.workspaceFiles.stat` 检查 `mai-specs/ROADMAP.md` 的大小，再通过 `remote.workspaceFiles.read` 分页读取，一个通过 `remote.workspaceFiles.list` 列出目录。页面拿不到其他 Host 能力，因此无法写入。

打开和刷新时，页面把 ROADMAP 的三个阶段分区解析成需求行，按编号排序，非数字编号排在其后。每行把链接解析为目录，并检查该目录仍在 `mai-specs/` 内；指向外部的行永远不会发起列目录请求。展开需求时递归列出其目录，直到固定深度，`BRIEF.md` 排第一，其余按路径排序。过滤生效期间，页面列出所有需求目录，以便文件名参与匹配；匹配遵循共享的 Client 搜索规则。

代数计数器与中止信号会丢弃被更新的刷新或工作区切换取代的读取结果。刷新失败时保留上次的列表，并在其上方显示提示。

| 文件 | 职责 |
| --- | --- |
| `src/client/index.ts` | 页面类型、引导页入口、字典与注入的读取操作 |
| `src/client/face.ts` | 基于 `remote.workspaceFiles` 的两个读取操作 |
| `src/client/roadmap.ts` | ROADMAP 表格解析、编号排序与是否在 `mai-specs` 内的检查 |
| `src/client/feature-files.ts` | 递归列目录与文件排序 |
| `src/client/filter.ts` | 过滤索引与匹配 |
| `src/client/state.ts` | 页面状态、reducer，以及哪些目录还需要列出 |
| `src/client/WorkbenchBody.tsx` | 页面本身：页头、过滤框、树、键盘导航与状态提示 |
| `src/client/locales.ts` | 全部 8 种发布语言的可见文案 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [`@deepseek-ai/dsh-client-ui-sidebar-right`](../../client/ui-sidebar-right/README.zh.md)——右侧边栏、页面类型与引导页入口。
- [`@deepseek-ai/dsh-api-workspace-files`](../../api/workspace-files/README.zh.md)——读取与列目录操作、其上限与工作区检查。
- [Client 搜索与过滤规则](../../client/AGENTS.md#search-and-filter)——过滤如何对匹配排序。
- [实验性包](../README.zh.md)——实验性状态的含义，以及包如何晋升。

-----

<a id="model-experience"></a>
## 模型体验

无，因为页面只读取工作区文件并在浏览器中渲染；它不注册工具、提示词片段或模型输入。

#### KV Cache 影响

无影响。本包从不构造模型请求，也从不修改提示词。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **没有任何发布组合挂载本包。** 本包是私有包，只能通过其 patch 文件加载；没有 bundle 或 profile 包含它。
- **指向工作区外的 `mai-specs` 符号链接只被跟随一半。** Host 读取文件时只拒绝末端符号链接，所以页面会读到工作区外的 ROADMAP；Host 拒绝列目录，所以每个需求都显示「未找到需求目录」。由于 Host 本身允许这次读取，页面不另加检查。
- **读取量有上限。** ROADMAP 超过 2 万行或 2 MB 时按文件过大拒绝读取，每个需求最多列出 2000 个条目；超出或被 Host 截断的清单显示已读到的部分，并提示列表不完整。过滤只匹配已读到的文件，深于第 8 层的目录不展开且不提示。
- **不实时更新。** 页面只在打开、切换工作区和刷新时读取 ROADMAP，在展开需求或过滤需要时列出需求目录。页面不监听磁盘变化。
- **六种语言为机器翻译。** 中文和英文与该需求的 PRD 逐字一致；日语、西班牙语、法语、德语、俄语和葡萄牙语文案未经人工校对。
- **recorded-session 覆盖已获豁免。** 包测试覆盖解析、列目录、读取上限、过滤与 jsdom 页面；`apps/web/tests/sdd-workbench-panel.e2e.ts` 通过仅测试用的 overlay 在 shipped Web 表面上挂载本插件，并比较已提交的 ARIA golden。经 owner 决定，本实验包不新增 keyless recorded-session 场景；后续 profile 或 bundle 转正时必须补充。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

需求、设计、评审与测试计划见 [`mai-specs/999-sdd-workbench`](../../../mai-specs/999-sdd-workbench/BRIEF.md)。

</details>
