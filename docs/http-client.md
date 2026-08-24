# HTTP Client

- [Introduction](#introduction)
- [Making Requests](#making-requests)
    - [Request Data](#request-data)
    - [Headers](#headers)
- [Responses](#responses)
- [Testing](#testing)

<a name="introduction"></a>
## Introduction

Nodevel's HTTP client is a fluent wrapper around the global `fetch` — the equivalent of Laravel's `Http` facade.

```js
const Http = require('@nodevel/framework').Facades.Http;

const response = await Http.get('https://example.com/users');
```

<a name="making-requests"></a>
## Making Requests

```js
const Http = require('@nodevel/framework/src/Http/Client').default;

const res = await Http.get(url);
const res = await Http.post(url, { name: 'Taylor' });
const res = await Http.put(url, payload);
const res = await Http.patch(url, payload);
const res = await Http.delete(url);
```

Relative URLs resolve against a configured base:

```js
const api = Http.baseUrl('https://api.example.com');
await api.get('/users');
```

<a name="making-requests-request-data"></a>
### Request Data

Objects passed as the body serialize to JSON automatically:

```js
await Http.post('https://api.example.com/users', {
    name: 'Steve',
    role: 'Admin',
});
```

<a name="making-requests-headers"></a>
### Headers

Chain header configuration:

```js
await Http
    .withToken(process.env.API_TOKEN)     // Bearer token
    .acceptJson()
    .get('https://api.example.com/users');

await Http.withHeaders({ 'x-custom': 'value' }).get(url);
```

Set a per-request timeout in seconds:

```js
await Http.timeout(5).get(url);
```

<a name="responses"></a>
## Responses

```js
res.status();       // 200
res.ok();           // true
res.successful();   // 2xx
res.clientError();  // 4xx
res.serverError();  // 5xx
res.headers();      // response headers object
await res.json();   // parsed JSON body
await res.body();   // raw string body
```

Throw on failure:

```js
await (await Http.get(url)).throw();
// Throws { status, message } on 4xx / 5xx.
```

<a name="testing"></a>
## Testing

Swap the bound client with a fake:

```js
app.instance('http.client', fakeHttpClient);
```
