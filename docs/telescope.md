# Telescope Debug Assistant

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Local Debugging Toolkit](#local-debugging-toolkit)

<a name="introduction"></a>
## Introduction

Laravel Telescope provides insight into requests, exceptions, database queries, queued jobs, mail, and more during local development.

<a name="nodevel-status"></a>
## Nodevel Status

No bundled inspector UI. The equivalents in Nodevel's local workflow:

| Telescope entry type | Nodevel equivalent |
| --- | --- |
| Requests | Log channel `stderr` + response status printed by the dev server |
| Exceptions | `HttpKernel.reportError` writes full stacks to the active log channel |
| Queries | `connection.listen(...)` query logging (see [pulse](/framework/docs/pulse)) |
| Jobs | `queue:failed` / failed_jobs table with full exception traces |
| Mail | `log` mailer persists every message as `.eml` under `storage/framework/mail` |
| Cache / Redis | `cache:clear`, array driver with per-key inspection via `app.make('cache').get()` |

Enable verbose local logging:

```ini
LOG_CHANNEL=stack      # stack = single file + console
APP_DEBUG=true
```

The Tinker REPL gives direct access to the booted application for ad-hoc probing:

```shell
node bin/artisan.js tinker
>>> await app.make('db').table('users').count()
```
