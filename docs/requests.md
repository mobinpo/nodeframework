# HTTP Requests

- [Accessing the Request](#accessing-the-request)
- [Request Path and Host](#request-path-and-host)
- [Retrieving Input](#retrieving-input)
    - [Values From Query String and Body](#values-from-query-string-and-body)
    - [Old Input](#old-input)
    - [Cookies](#cookies)
    - [Files](#files)
- [Headers](#headers)
- [Request Metadata](#request-metadata)

<a name="accessing-the-request"></a>
## Accessing the Request

Every route closure, controller method, and middleware receives the current request as its first argument:

```js
Route.get('/path', (request) => request.path());
```

<a name="request-path-and-host"></a>
## Request Path and Host

| Method        | Description                                     |
| ------------- | ----------------------------------------------- |
| `path()`      | Request path without the query string.          |
| `url()`       | URL without the query string.                   |
| `fullUrl()`   | Full URL including query string.                |
| `host()`      | Host header value.                              |
| `method()`    | HTTP verb.                                      |
| `isMethod(m)` | Verb comparison.                                |
| `secure()`    | Whether HTTPS is used.                          |
| `ip()`        | Client IP (honors `X-Forwarded-For`).           |

```js
if (request.path() === 'settings') { /* ... */ }
```

<a name="retrieving-input"></a>
## Retrieving Input

<a name="values-from-query-string-and-body"></a>
### Values From Query String and Body

`input()` merges query string and body values:

```js
const name = request.input('name', 'default');
const all = request.all();
```

Query-string-only access via `query(key)`, body-only via `post(key)`. Retrieve subsets with `only([...keys])` / `except([...keys])`, check presence with `has(...keys)`, and cast with `boolean(key)` or `integer(key)`. JSON bodies parse through `json(path)`.

Form method spoofing mirrors Laravel: POST requests carrying `_method=PUT` are treated as PUT.

<a name="old-input"></a>
### Old Input

Flash input to the session so it survives a redirect, then read it back:

```js
session().flash('_old_input', request.all());
```

Blade's `@checked`, `@selected`, and `@disabled` directives accept old values for convenient re-population.

<a name="cookies"></a>
### Cookies

Read cookies by name:

```js
const theme = request.cookie('theme');
```

Response cookies are set fluently: `response.cookie(name, value, options)`.

<a name="files"></a>
### Files

Uploaded files appear in `request.all()` under their field names when submitted as `multipart/form-data`; persist binary content to a storage disk via the `storage` service.

<a name="headers"></a>
## Headers

```js
const token = request.header('X-Token');
if (request.hasHeader('X-Token')) { /* ... */ }
```

Bearer API tokens are read directly:

```js
const token = request.bearerToken();
```

<a name="request-metadata"></a>
## Request Metadata

| Method         | Description                                    |
| -------------- | ---------------------------------------------- |
| `wantsJson()`  | Whether the client accepts JSON.               |
| `ajax()`       | `X-Requested-With: XMLHttpRequest` present.     |
| `route(p)`     | Matched route parameter (or all parameters).   |
| `attribute(k)` | Request-scoped attribute bag.                  |
| `user()`       | Authenticated user (set by the auth guard).    |
