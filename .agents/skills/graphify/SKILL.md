---
name: graphify
description: "Use for any question about a codebase, its architecture, file relationships, or project content — especially when graphify-out/ exists, where the question should be treated as a graphify query first. Turns any input (code, docs, papers, images, videos) into a persistent knowledge graph with god nodes, community detection, and query/path/explain tools."
---

# /graphify

Installed from [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify), `graphify/skill.md` (main branch, retrieved 2026-11-13).

This repo copy is intentionally abridged to safe, repeatable Codex workflows. The upstream file contains lengthy shell pipelines, automatically installs Python packages, and can create many generated outputs. Those procedures are omitted here; follow upstream for details after reviewing its current instructions.

## Purpose

Build or query a local knowledge graph for code and project documents. Graphify is useful when many future questions will reuse the graph, when relationships cross files or document types, or when structural questions need more than text search. For a focused lookup in a normal-sized repository, use `rg` and file reads first.

## Install the CLI

Graphify requires Python 3.10+. Install it explicitly when the user requests graph generation:

```powershell
uv tool install graphifyy
```

Or use `pipx install graphifyy`. Do not install packages as an implicit side effect of a graph query.

## Usage

```text
/graphify <path>
/graphify <path> --update
/graphify query "<question>"
/graphify path "<concept A>" "<concept B>"
/graphify explain "<concept>"
```

Graph generation writes `graphify-out/` in the selected project. Explain that output before generating. Do not commit generated graphs unless requested. The project root may contain sensitive configuration: rely on Graphify's sensitive-file filtering, inspect its detected scope, and never include secrets in a graph.

Code-only AST extraction is local and deterministic. Semantic extraction of documents and images uses model context or configured external services and may consume substantial tokens. State scope and cost before a large semantic run; ask before sending project documents to an external API.

## Codex workflow

1. If `graphify-out/graph.json` exists and the user asks a codebase question, query the existing graph first.
2. For one-off, narrow questions, prefer repository search and direct reads.
3. Before a new build, inspect scope and size; narrow to a relevant subfolder when the corpus is large.
4. For code-only extraction, use the installed CLI and its documented command. Do not reproduce upstream's long inline scripts.
5. For semantic extraction, use available project agents only if the user requested graph building and the environment supports that workflow. Never claim extraction completed without valid output.
6. Report generated paths, file scope, and whether relationships are extracted or inferred.

## Source

- Upstream: https://github.com/Graphify-Labs/graphify
- Skill file: https://github.com/Graphify-Labs/graphify/blob/main/graphify/skill.md
- Upstream project currently documents Apache-2.0 and MIT licensed components. This adapted workflow is authored for this repository; consult upstream licensing and attribution for redistributed source material.
