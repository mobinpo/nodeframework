# Nodevel

**Nodevel** is a Laravel-inspired web application framework for Node.js — expressive, elegant syntax for building full-stack web applications and APIs. Written in **TypeScript** (run directly via [`tsx`](https://github.com/esbuild-kit/tsx), type-checked with `tsc`).

## Features

- **Artisan console** (`npx tsx bin/artisan.ts`) — `serve`, `test`, `migrate`, `db:seed`, `db:wipe`, `queue:work`, `schedule:run`, `route:list`, `about`, `make:*` generators, and more
- **Eloquent ORM** — ActiveRecord models, relationships, eager loading, soft deletes, mass assignment protection, events, observers
- **Schema builder & migrations** — SQLite, MySQL/MariaDB, PostgreSQL
- **Blade templating engine** — directives, components, slots, layouts, stacks, fragments (htmx-friendly)
- **Routing** — verb methods, parameters with regex constraints, named routes, groups, model binding, fallbacks, rate limiting
- **Service container** — bind/singleton/scoped, contextual binding, tagging, automatic injection via `static inject`
- **Facades & global helpers** — `Route`, `DB`, `Cache`, `Session`, `Auth`, plus `view()`, `config()`, `env()`, `redirect()`
- **Sessions & CSRF** — encrypted session cookies, file/array drivers
- **Sanctum-style API tokens** — abilities, expiration, revocation
- **Queues** — sync/file/database drivers with a retrying worker
- **Validation** — Laravel-syntax rules (`required|email|unique:users`)
- **Events, notifications, mail, broadcasting** — driver based
- **Dates** — fluent `Date` wrapper (`Support/Date`) with Carbon-style arithmetic
- **Laravel Boost (Nodevel edition)** — bundled MCP server: `npx tsx bin/boost.ts install`
- **Testing** — in-process HTTP client, assertions, `npx tsx bin/artisan.ts test`

## Installation

Install the Nodevel CLI globally:

```shell
npm install -g @nodevel/cli
```

Then create a new application — just like `laravel new`:

```shell
nodevel new project-name
cd project-name
npm run dev          # http://localhost:8000
```

The installer copies the application skeleton, generates your `APP_KEY`, initializes git, and installs dependencies.

## Quick Start (this repository)

This repository is the development environment for the framework packages:

| Package | npm | Path |
| --- | --- | --- |
| Framework core | [`@nodevel/framework`](https://www.npmjs.com/package/@nodevel/framework) | `vendor/nodevel/framework` |
| Blade engine | [`@nodevel/blade`](https://www.npmjs.com/package/@nodevel/blade) | `vendor/nodevel/blade` |
| Installer CLI | [`@nodevel/cli`](https://www.npmjs.com/package/@nodevel/cli) | `cli` |

To hack on the framework using this repo as the demo app:

```shell
npm install
cp .env.example .env             # then: npx tsx bin/artisan.ts key:generate
npx tsx bin/artisan.ts migrate   # create tables
npx tsx bin/artisan.ts serve     # http://localhost:8000
```

npm scripts: `npm run artisan -- <command>`, `npm run serve`, `npm test`, `npm run typecheck`.

## Example

```ts
// routes/web.ts
const { Route } = require('@nodevel/framework').Facades;

Route.get('/', () => view('welcome', { name: 'Nodevel' }));

// app/Models/Post.ts
class Post extends Model {
    static table: string = 'posts';
    static fillable: string[] = ['title', 'body'];
    static softDeletes: boolean = true;
}

await Post.create({ title: 'Hello', body: 'World' });
const posts = await Post.query().latest().limit(10).get();
```

## Documentation

Full documentation lives in [`docs/`](docs/index.html) — open `docs/index.html` in a browser for the navigable version. Pages mirror the Laravel manual: installation, routing, middleware, blade, eloquent, migrations, validation, queues, scheduling, sanctum, testing, and more.

## Tests

```shell
npx tsx bin/artisan.ts test
```
