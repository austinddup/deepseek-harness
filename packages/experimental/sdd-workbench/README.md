---
description: "Experimental right-sidebar page that lists the my-ai-infra features in a workspace's mai-specs folder by ROADMAP stage and opens their spec files read-only in the document preview."
kind: "package-reference"
---

# @deepseek-ai/dsh-sdd-workbench

English | [中文](README.zh.md)

## Summary

Adds an SDD workbench page to the Web right sidebar. It reads `mai-specs/ROADMAP.md` in the Session's workspace and lists its features by ROADMAP stage section, newest number first. Expand a feature to see its files, click one to open it in the document preview, or filter by number, title, or file name. The page never writes files and registers nothing for the model. It loads only when you start DSH with its patch file.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Build the repository once, start the Web app with the package's patch file, then open the page in a Session whose workspace is the project that contains `mai-specs/`.

### When to choose it

Choose it when a project keeps its features in the layout that my-ai-infra creates (`mai-specs/ROADMAP.md` plus one folder per feature) and you want to follow progress and read specs without leaving DSH. Use the right sidebar's Files page for any other folder layout, and an editor when you need to change a spec.

### Start DSH with the page

Run these commands from the repository root. The build produces the Client bundle that the browser loads; repeat it after you change the package source.

```sh
pnpm install
pnpm run build:artifacts
pnpm dsh web --patch packages/experimental/sdd-workbench/sdd-workbench.patch.yml
```

Keep the `--patch` argument. Without it, DSH starts normally and the page is silently absent. To check the composition without starting a server, add `--dump-config` to the same command line with `--profile web` in place of `web`:

```sh
pnpm dsh --profile web --patch packages/experimental/sdd-workbench/sdd-workbench.patch.yml --dump-config
```

The last block of the output comes from the patch file and contains the row `id: sdd-workbench`. After you change only this package, `pnpm --filter @deepseek-ai/dsh-sdd-workbench bundle` rebuilds its Client bundle faster than the full build; reload the browser page to use it.

### Open the page in the right workspace

1. In the Web app, add the project folder with **Add workspace** in the left sidebar, and start a Session in that workspace. A new Session in the default workspace has no `mai-specs/` folder and shows "mai-specs/ROADMAP.md not found".
2. Open the right sidebar. Its guide shows an **SDD workbench** card; click it to open the page in that pane.
3. Expand a feature to list its files, and click a file to open it in the document preview. Type in the filter box to narrow the list; press Escape to clear it.
4. Click the refresh button after files change on disk. The page does not watch the folder.

### Minimal configuration

The patch file inserts one row; the package has no configuration fields.

```yaml
- insert:
    - id: sdd-workbench
      name: './src/index.ts'
```

The relative `name` resolves against the patch file's directory, so the row works from any working directory.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The Host entry is empty; all work happens in the browser. The Client entry registers a page type in the right sidebar and hands the page two read operations bound to its Session: one reads `mai-specs/ROADMAP.md` page by page through `remote.workspaceFiles.read`, and one lists a directory through `remote.workspaceFiles.list`. The page receives no other Host access, so it cannot write.

On open and on refresh, the page parses the ROADMAP's three stage sections into feature rows, sorted by number with non-numeric ids after them. Each row resolves its link to a folder and checks that the folder stays inside `mai-specs/`; a row that points outside never triggers a listing. Expanding a feature lists its folder recursively to a fixed depth, `BRIEF.md` first and the rest by path. While a filter is active, the page lists every feature folder so file names can match, and matches follow the shared Client search rule.

A generation counter and an abort signal drop the results of a read that a newer refresh or a workspace change replaced. A failed refresh keeps the last list and shows a notice above it.

| File | Responsibility |
| --- | --- |
| `src/client/index.ts` | Page type, guide entry, dictionaries, and the injected read operations |
| `src/client/face.ts` | The two read operations over `remote.workspaceFiles` |
| `src/client/roadmap.ts` | ROADMAP table parsing, id order, and the inside-`mai-specs` check |
| `src/client/feature-files.ts` | Recursive folder listing and file order |
| `src/client/filter.ts` | Filter index and matching |
| `src/client/state.ts` | Page state, its reducer, and which folders still need a listing |
| `src/client/WorkbenchBody.tsx` | The page: header, filter box, tree, keyboard navigation, and state lines |
| `src/client/locales.ts` | Every visible string in all eight shipped languages |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [`@deepseek-ai/dsh-client-ui-sidebar-right`](../../client/ui-sidebar-right/README.md) — the right sidebar, its page types, and the guide entries.
- [`@deepseek-ai/dsh-api-workspace-files`](../../api/workspace-files/README.md) — the read and list operations, their limits, and their workspace checks.
- [Client search and filter rule](../../client/AGENTS.md#search-and-filter) — how the filter ranks matches.
- [Experimental packages](../README.md) — what experimental status means and how a package is promoted.

-----

<a id="model-experience"></a>
## Model Experience

None, as the page only reads workspace files and renders them in the browser; it registers no tool, prompt section, or model input.

#### KV Cache effect

No effect. The package never constructs a model request and never changes a prompt.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Not mounted by any shipped composition.** The package is private and loads only through its patch file; no bundle or profile includes it.
- **A `mai-specs` symbolic link that leaves the workspace is half followed.** The Host refuses only a final-component link when it reads a file, so the page reads a ROADMAP outside the workspace; the Host refuses the directory listings, so every feature shows "folder not found". The page adds no check of its own because the Host already allows the read.
- **Reads are capped.** A ROADMAP over 20,000 lines or 2 MB is refused as too large, and a feature lists at most 2,000 entries; a longer or Host-truncated listing shows what was read and says the list is incomplete. A filter matches only files already read, and folders below depth 8 are left out without notice.
- **No live updates.** The page reads on open, on a workspace change, and on refresh only.
- **Six languages are machine translations.** Chinese and English match the feature's PRD word for word; the Japanese, Spanish, French, German, Russian, and Portuguese strings have not been reviewed by a person.
- **Recorded-session coverage is exempted.** Package tests cover parsing, listing, read limits, filtering, and the jsdom page; `apps/web/tests/sdd-workbench-panel.e2e.ts` mounts the plugin through a test-only overlay over the shipped Web surface and compares a committed ARIA golden. By owner decision, this experimental package adds no keyless recorded-session scenario; a profile or bundle promotion must add one.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The requirement, design, review, and test plan live in [`mai-specs/999-sdd-workbench`](../../../mai-specs/999-sdd-workbench/BRIEF.md).

</details>
