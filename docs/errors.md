# Error Handling

- [Introduction](#introduction)
- [Configuration](#configuration)
    - [Debug Mode](#debug-mode)
- [The Exception Handler](#the-exception-handler)
    - [HTTP Exceptions](#http-exceptions)
    - [Custom HTTP Error Pages](#custom-http-error-pages)

<a name="introduction"></a>
## Introduction

When a route handler throws, Nodevel's exception handler converts it into an HTTP response. Uncaught errors render a 500 page and are logged; typed errors with a `status` property render that status code.

<a name="configuration"></a>
## Configuration

<a name="debug-mode"></a>
### Debug Mode

The `APP_DEBUG` environment variable controls how much detail is shown. **In production always set `APP_DEBUG=false`** — debug responses include stack traces.

```ini
APP_DEBUG=true
```

<a name="the-exception-handler"></a>
## The Exception Handler

Throw anywhere in your app:

```js
const error = new Error('Payment failed.');
error.status = 422;
throw error;
```

The kernel renders `{ "message": "..." }` for JSON requests or an HTML error page otherwise. 422 validation responses also flash `errors` into the session for Blade display.

Common built-ins:

| Status | Thrown by                          |
| ------ | ---------------------------------- |
| 401    | `auth` middleware (unauthenticated)|
| 403    | `verified` middleware              |
| 404    | Missing model / unmatched route    |
| 419    | CSRF token mismatch                |
| 503    | Maintenance mode                   |

`findOrFail` and friends throw 404s carrying the proper status automatically.

<a name="http-exceptions"></a>
### HTTP Exceptions

Abort-style helpers map directly to thrown errors:

```js
function abort(status, message) {
    const error = new Error(message || 'Error');
    error.status = status;
    throw error;
}

abort(403, 'This action is unauthorized.');
```

<a name="custom-http-error-pages"></a>
### Custom HTTP Error Pages

Create views named after the status code:

```
resources/views/errors/404.blade.js
resources/views/errors/503.blade.js
```

The renderer uses these templates when present.
