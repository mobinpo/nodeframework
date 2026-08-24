# Release Notes

## Nodevel 1.0

Nodevel 1.0 introduces the complete framework core:

- **Artisan console** — `serve`, `test`, `migrate` (+ `rollback`, `reset`, `refresh`, `fresh`, `status`), `db:seed`, `db:wipe`, `queue:work` / `queue:table` / `queue:failed` / `queue:retry` / `queue:forget` / `queue:flush`, `schedule:run` / `schedule:list`, `route:list`, `about`, `tinker`, `key:generate`, `config:*`, `view:*`, `cache:clear`, `optimize`, `down` / `up`, `storage:link`, `env:encrypt` / `env:decrypt`, and the full `make:*` generator family.
- **Eloquent ORM** — ActiveRecord models, relationships (`hasOne`, `hasMany`, `belongsTo`, `morphOne`, `morphMany`, `morphTo`, `hasManyThrough`, `belongsToMany` with a pivot builder), eager loading, soft deletes, casts, accessors, mutators, events, observers, global scopes, and pagination.
- **Schema builder** — driver-aware DDL for SQLite, MySQL/MariaDB, and PostgreSQL.
- **Blade templating** — echoes, conditionals, loops with `$loop`, `@forelse`, switch, includes, components (class + anonymous), slots, layouts/sections, stacks, `@once`, `@verbatim`, fragments for htmx, and custom directives via the registry.
- **HTTP layer** — router with verbs, parameters + constraints, named routes, groups, model binding, fallbacks, rate limiting; middleware pipeline; encrypted session cookies with flash data; CSRF verification; maintenance mode with secret bypass; file uploads through the storage disks; streamed responses.
- **Services** — container (bind/singleton/scoped/contextual/tagged), facades, validation with database rules, cache (array/file/redis), queues (sync/file/database) with retries and failed-job storage, scheduler with cron parsing, mail (log/smtp/array), notifications (mail/database/broadcast), broadcasting (log/pusher/array), filesystem, logging (single/daily/stack), encryption, hashing, HTTP client, Sanctum-style personal access tokens.

Upgrading between patch versions requires no changes: the framework is loaded from `vendor/nodevel` and pinned by your `package.json`.
