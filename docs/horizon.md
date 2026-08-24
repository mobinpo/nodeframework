# Horizon Queue Monitoring

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Monitoring Nodevel Queues](#monitoring-queues)

<a name="introduction"></a>
## Introduction

Laravel Horizon provides a dashboard and code-driven configuration for Redis-backed queues: job metrics, failed-job handling, and supervisor management.

<a name="nodevel-status"></a>
## Nodevel Status

No dashboard is bundled. Nodevel queues expose the same operational surface through Artisan:

| Task | Command |
| --- | --- |
| Start workers | `node bin/artisan.js queue:work --queue=default --tries=3` |
| Drain then exit | `node bin/artisan.js queue:work --stop-when-empty` |
| List failed jobs | `node bin/artisan.js queue:failed` |
| Retry failures | `node bin/artisan.js queue:retry all` (or by UUID / ID) |
| Delete one failure | `node bin/artisan.js queue:forget <uuid>` |
| Purge failures | `node bin/artisan.js queue:flush` |

Failed jobs persist to the `failed_jobs` table with `uuid`, `queue`, `payload`, `exception`, and `failed_at` columns, matching Laravel's schema.

<a name="monitoring-queues"></a>
## Monitoring Nodevel Queues

Run workers under a process supervisor and alert on the failed-jobs count:

```js
// routes/console.js — nightly health check
schedule.command('queue:failed').dailyAt('03:00');
```

Because the worker dispatches an `job.failed` event on terminal failure, you can hook metrics there:

```js
app.make('events').listen('job.failed', (error) => {
    app.make('log').error('queue job failed permanently', { error: String(error) });
});
```

For Redis-backed throughput at scale, install `ioredis` and point `config/cache.js`'s redis store at your instance; the cache and queue layers accept any ioredis-compatible client.
