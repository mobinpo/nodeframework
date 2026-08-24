# @nodevel/framework

**Nodevel** is a Laravel-inspired web application framework for Node.js — expressive, elegant syntax for building full-stack web applications and APIs. Written in TypeScript and run directly via [`tsx`](https://github.com/esbuild-kit/tsx).

## Features

- **Artisan console** — `serve`, `test`, `migrate`, `db:seed`, `db:wipe`, `queue:work`, `schedule:run`, `route:list`, `about`, `key:generate`, `make:*` generators, and more
- **Eloquent ORM** — ActiveRecord models, relationships, eager loading, soft deletes, mass assignment protection, events, observers
- **Schema builder & migrations** — SQLite, MySQL/MariaDB, PostgreSQL
- **Routing** — verb methods, parameters with regex constraints, named routes, groups, model binding, fallbacks, rate limiting
- **Service container** — bind/singleton/scoped, contextual binding, tagging, automatic injection via `static inject`
- **Facades & global helpers** — `Route`, `DB`, `Cache`, `Session`, `Auth`, plus `view()`, `config()`, `env()`, `redirect()`
- **Sessions & CSRF** — encrypted session cookies, file/array drivers
- **Sanctum-style API tokens** — abilities, expiration, revocation
- **Queues** — sync/file/database drivers with a retrying worker
- **Validation** — Laravel-syntax rules (`required|email|unique:users`)
- **Events, notifications, mail, broadcasting** — driver based
- **Dates** — fluent `Date` wrapper (`Support/Date`) with Carbon-style arithmetic
- **Testing** — in-process HTTP client, assertions, `artisan test`

## Installation

The recommended way to create a new Nodevel application is the installer:

```shell
npm install -g @nodevel/cli
nodevel new project-name
```

To add the framework to an existing project:

```shell
npm install @nodevel/framework @nodevel/blade better-sqlite3
```

## Quick Example

```ts
// routes/web.ts
const { Route } = require('@nodevel/framework').Facades;

Route.get('/', () => view('welcome', { name: 'Nodevel' }));

// app/Models/Post.ts
class Post extends Model {
    static table = 'posts';
    static fillable = ['title', 'body'];
    static softDeletes = true;
}

await Post.create({ title: 'Hello', body: 'World' });
const posts = await Post.query().latest().limit(10).get();
```

Run it:

```shell
npx tsx bin/artisan.ts serve   # http://localhost:8000
```

## Documentation

Full documentation lives in the [repository](https://github.com/mobinpo/nodeframework/tree/main/docs) — installation, routing, middleware, blade, eloquent, migrations, validation, queues, scheduling, testing, and more.

## License

[MIT](https://github.com/mobinpo/nodeframework/blob/main/LICENSE)
