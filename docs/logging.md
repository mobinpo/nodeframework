# Error Handling and Logging

- [Introduction](#introduction)
- [Logging](#logging)
    - [Configuration](#configuration)
    - [Writing Log Messages](#writing-log-messages)
    - [Log Levels](#log-levels)
- [The Exception Handler](#the-exception-handler)
    - [Reporting Exceptions](#reporting-exceptions)
    - [HTTP Exceptions](#http-exceptions)

<a name="introduction"></a>
## Introduction

When you start a new Nodevel project, error and exception handling is already configured: exceptions thrown inside requests are caught, reported to the log, and converted into HTTP responses — debug traces locally, generic messages in production.

<a name="logging"></a>
## Logging

<a name="configuration"></a>
### Configuration

Logging behavior lives in `config/logging.js`. The default `stack` channel aggregates other channels:

| Driver    | Description                                        |
| --------- | -------------------------------------------------- |
| `single`  | One log file (`storage/logs/nodevel.log`).          |
| `daily`   | Rotating files per day, pruned after N days.        |
| `stderr`  | Writes to stderr — container friendly.              |

Select a channel with `LOG_CHANNEL` in `.env`.

<a name="writing-log-messages"></a>
### Writing Log Messages

```js
const { Log } = require('@nodevel/framework').Facades;

Log.info('User logged in', { userId: 1 });
Log.error('Payment failed', { orderId: 42 });
```

Structured context objects are JSON-encoded onto the line.

<a name="log-levels"></a>
### Log Levels

PSR-3 levels, lowest to highest severity:

`debug`, `info`, `notice`, `warning`, `error`, `critical`, `alert`, `emergency`.

Messages below the channel's configured level are discarded.

<a name="the-exception-handler"></a>
## The Exception Handler

Unhandled exceptions flow through the HTTP kernel's renderer.

<a name="reporting-exceptions"></a>
### Reporting Exceptions

Every 5xx error is written to the configured log channel with its stack trace; expected errors (404s) skip reporting.

<a name="http-exceptions"></a>
### HTTP Exceptions

Throw errors carrying a `status` property to control the response code:

```js
const error = new Error('Not allowed');
error.status = 403;
throw error;
```

JSON-negotiating clients receive `{ message, exception? }`; browsers receive an HTML page. Validation failures (422) flash errors into the session for Blade's `@error` directive.
