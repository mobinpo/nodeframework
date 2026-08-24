# HTTP Responses

- [Creating Responses](#creating-responses)
    - [Attaching Headers](#attaching-headers)
    - [Attaching Cookies](#attaching-cookies)
- [Redirects](#redirects)
- [Other Response Types](#other-response-types)
    - [JSON Responses](#json-responses)
    - [File Downloads](#file-downloads)
    - [Streamed Responses](#streamed-responses)

<a name="creating-responses"></a>
## Creating Responses

Route and controller handlers may return strings, objects, views, or `Response` instances — all are normalized automatically:

```js
Route.get('/text', () => 'Hello World');

Route.get('/json', () => ({ message: 'Hello' }));   // auto JSON

Route.get('/custom', () => {
    const { Response } = require('@nodevel/framework').Http;
    return Response.make('Hello', 200, { 'X-Custom': 'value' });
});
```

<a name="attaching-headers"></a>
### Attaching Headers

```js
response.header('Content-Type', 'text/plain').withHeaders({
    'X-RateLimit-Remaining': 59,
});
```

<a name="attaching-cookies"></a>
### Attaching Cookies

```js
response
    .cookie('theme', 'dark', { httpOnly: true, maxAgeMs: 86400000 })
    .withoutCookie('banner');
```

Cookies default to `HttpOnly` with `SameSite=Lax`; pass `secure: true` for HTTPS-only.

<a name="redirects"></a>
## Redirects

Use the global `redirect` helper:

```js
return redirect('/dashboard');                 // simple redirect (302)
return redirect()->to('/dashboard', 301);      // custom status
return redirect()->route('profile');           // named routes
return redirect()->back();                     // referer or fallback
```

Or from route definitions:

```js
Route.redirect('/here', '/there');
Route.permanentRedirect('/here', '/there');
```

<a name="other-response-types"></a>
## Other Response Types

<a name="json-responses"></a>
### JSON Responses

```js
return response().json({ user: user.toArray() }, 201);
```

Returning a plain object or array from any handler produces JSON automatically; Eloquent models serialize via their `toArray()` / `toJson()` methods.

<a name="file-downloads"></a>
### File Downloads

Serve files through the storage service:

```js
const fs = require('fs');
const content = await app().make('storage').disk().get('reports/report.pdf');
return response().make(content, 200, { 'content-disposition': 'attachment; filename="report.pdf"' });
```

<a name="streamed-responses"></a>
### Streamed Responses

For large payloads stream from an async iterable:

```js
const { Response } = require('@nodevel/framework').Http;

Response.stream(async function* () {
    for (let i = 0; i < 1000; i++) yield String(i);
}, 200);
```
