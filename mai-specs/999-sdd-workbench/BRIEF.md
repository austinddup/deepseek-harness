# 999: SDD 工作台：Feature 导航与规格查看

| 项 | 值 |
|---|---|
| Phase | draft |
| Profile | standard |
| 优先级 | P1 |
| 负责人 | austin |
| 目标日期 | 2026-11-20 |
| 涉及子系统 | DSH Web 插件（packages/ 下新包） |

## 一句话描述

在 DSH Web 中浏览当前项目 mai-specs 的 Feature 列表，并只读查看各 Feature 的规格文档

## 背景

用 my-ai-infra 做 SDD 时，Feature 状态与规格文档分散在 mai-specs 的 Markdown 文件中，需要切到编辑器逐个打开，在 DSH 内无法查看开发进度

## 关键决策

- 2026-11-18 范围：只读浏览 Feature 列表与规格文档；数据根为会话工作目录，文档复用右侧栏文档预览，列表按 ROADMAP 分区分组。详见 [PRD](spec/PRD.md) 待确认事项。
- 2026-11-19 PRD 评审：文件清单含全部文件、新增列表过滤搜索、删除刷新快捷键、刷新失败保留旧列表。详见 [PRD 评审记录](review/prd_review.md)。

## 上下文索引

- [素材索引](context/_INDEX.md)
- [PRD](spec/PRD.md)：有效需求与 AC 维护源
- [PRD 评审记录](review/prd_review.md)
