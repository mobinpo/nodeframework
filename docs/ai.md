# AI Assisted Development

- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Rules and Guidelines](#project-rules-and-guidelines)
- [Boost Integration](#boost-integration)

<a name="introduction"></a>
## Introduction

Nodevel is built to be written with AI. The framework ships deterministic, versioned context about itself — the same docs you are reading, plus a live MCP server — so coding agents generate correct Nodevel code on the first try instead of hallucinating APIs.

Two pieces work together:

1. **The documentation** — every page in `docs/` matches its Laravel counterpart page-for-page, adapted for Node.js.
2. **Laravel Boost (Nodevel edition)** — an MCP server exposing your application's real state to agents.

<a name="prerequisites"></a>
## Prerequisites

- Node.js 20+ (`node --version`)
- A Nodevel application (`npx tsx bin/artisan.ts` runs successfully)

<a name="getting-started"></a>
## Getting Started

Install Boost's agent configuration, then open your editor as usual:

```shell
npx tsx bin/boost.ts install
```

Agents that support MCP (Claude Code, Cursor, Windsurf, Copilot agent mode) will discover the `nodevel` server from `.mcp.json` automatically.

Verify the server answers:

```shell
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx tsx bin/boost.ts mcp
```

<a name="project-rules-and-guidelines"></a>
## Project Rules and Guidelines

Create an `AGENTS.md` at your repository root so every agent shares the same rules:

```markdown
# AGENTS.md

- Framework: Nodevel (Laravel-port). Docs live in `docs/`, one page per Laravel doc.
- Always run `node artisan route:list` before adding routes.
- Models extend `require('@nodevel/framework').Eloquent.Model`.
- Tests: `npx tsx bin/artisan.ts test`. Never leave the suite red.
```

Keep it short and imperative — agents read it verbatim.

<a name="boost-integration"></a>
## Boost Integration

See the [Boost documentation](/boost) for the complete tool list. The short version: agents should call `application-info` first, `search-docs` when unsure of an API, and `last-error` when debugging — never guess what the framework can answer directly.
