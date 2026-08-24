# Nodevel

**Nodevel** is a Laravel-inspired web application framework for Node.js — expressive, elegant syntax for building full-stack web applications and APIs.

## Features

- **Artisan console** (`node bin/artisan.js`) — `serve`, `test`, `migrate`, `db:seed`, `db:wipe`, `queue:work`, `schedule:run`, `route:list`, `about`, `make:*` generators, and more
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
- **Laravel Boost (Nodevel edition)** — bundled MCP server: `node bin/boost.js install`
- **Testing** — in-process HTTP client, assertions, `node bin/artisan.js test`

## Quick Start

```shell
npm install
cp .env.example .env          # then: node bin/artisan.js key:generate
node bin/artisan.js migrate   # create tables
node bin/artisan.js serve     # http://localhost:8000
```

## Example

```js
// routes/web.js
const { Route } = require('@nodevel/framework').Facades;

Route.get('/', () => view('welcome', { name: 'Nodevel' }));

// app/Models/Post.js
class Post extends Model {
    static table = 'posts';
    static fillable = ['title', 'body'];
    static softDeletes = true;
}

await Post.create({ title: 'Hello', body: 'World' });
const posts = await Post.query().latest().limit(10).get();
```

## Documentation

Full documentation lives in [`docs/`](docs/index.html) — open `docs/index.html` in a browser for the navigable version. Pages mirror the Laravel manual: installation, routing, middleware, blade, eloquent, migrations, validation, queues, scheduling, sanctum, testing, and more.

## Tests

```shell
node bin/artisan.js test
```
