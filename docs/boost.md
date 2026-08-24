# Laravel Boost

- [Introduction](#introduction)
- [Installation](#installation)
- [Available Tools](#available-tools)
- [Connecting to Editors and Agents](#connecting-to-editors-and-agents)
- [Usage Guidelines](#usage-guidelines)

<a name="introduction"></a>
## Introduction

> **Nodevel adaptation:** Laravel Boost ships as a Composer package (`vendor/bin/boost`). In Nodevel it ships with the framework itself as `bin/boost.js` — no extra install step beyond `npm install`.

Laravel Boost is a local MCP (Model Context Protocol) server that gives AI agents deep knowledge of your Nodevel application. Instead of guessing at your routes, schema, or configuration, an agent asks Boost — which answers with structured, versioned truth straight from your running codebase.

<a name="installation"></a>
## Installation

Boost is bundled. Install its agent wiring with:

```shell
node bin/boost.js install
```

This writes a `nodevel` server entry into your project's `.mcp.json`:

```json
{
    "mcpServers": {
        "nodevel": {
            "command": "node",
            "args": ["bin/boost.js", "mcp"]
        }
    }
}
```

The server communicates over stdio using line-delimited JSON-RPC 2.0.

<a name="available-tools"></a>
## Available Tools

| Tool | Description |
| --- | --- |
| `application-info` | Application name, environment, drivers (database, cache, queue, session, mail), route files, and models |
| `route-list` | Every registered route: method, URI, name, action, middleware |
| `database-schema` | All tables with their columns and types |
| `search-docs` | Full-text search across the versioned Nodevel documentation |
| `last-error` | The most recent exception from `storage/logs` |

List tools without starting the server:

```shell
node bin/boost.js list-tools
```

Call any tool programmatically from Node:

```js
const { callTool } = require('./bin/boost');

const schema = await callTool('database-schema', { table: 'users' }, __dirname);
```

<a name="connecting-to-editors-and-agents"></a>
## Connecting to Editors and Agents

Once `.mcp.json` exists, point your agent at it:

- **Claude Code** — run `claude mcp add-from-claude-desktop`, or start manually with `node bin/boost.js mcp`.
- **Cursor / Windsurf** — add an MCP command entry pointing at `node bin/boost.js mcp`.
- **GitHub Copilot / VS Code** — register the same command under MCP servers in settings.

Because the protocol is plain JSON-RPC over stdio, any MCP-compatible client works without additional libraries.

Example session over stdio:

```shell
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}' | node bin/boost.js mcp
```

```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"nodevel-boost","version":"1.0.0"}}}
```

<a name="usage-guidelines"></a>
## Usage Guidelines

Boost reads your real application state — booted container, live router, actual database connection. Prefer it over letting agents parse source files by hand:

1. Ask for `application-info` before assuming drivers or versions.
2. Use `search-docs` so generated code follows the installed Nodevel version's API.
3. Check `last-error` before re-running failing tests blindly.
