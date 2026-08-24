# Pulse Application Monitoring

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Observing a Nodevel App](#observing-a-nodevel-app)

<a name="introduction"></a>
## Introduction

Laravel Pulse captures application usage (slow requests, slow queries, exceptions) into a dashboard.

<a name="nodevel-status"></a>
## Nodevel Status

No bundled dashboard. The same signals are available through the logging and query layers:

- **Slow queries** — enable query logging on the connection:

```js
const db = app.make('db').connection();
db.loggingQueries = true;
db.listen((query) => {
    if (query.timeMs > 200) {
        app.make('log').warning('slow query', { sql: query.sql, timeMs: query.timeMs });
    }
});
```

- **Exceptions** — `HttpKernel.reportError` already routes every non-404 exception to the configured log channel; ship those lines to your APM of choice.
- **Request timing** — wrap the kernel:

```js
const server = await handleRequestServer(basePath);
server.on('request', () => performance.mark('req-start'));
```

Because every service is a container binding, you can also extend the logger (`app.make('log')`) or swap the `db` binding with a timing proxy without touching application code — the same interception points Pulse uses internally.
