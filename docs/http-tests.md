# HTTP Tests

- [Introduction](#introduction)
- [Making Requests](#making-requests)
- [Testing JSON APIs](#testing-json-apis)
- [Session And Authentication](#session-and-authentication)

<a name="introduction"></a>
## Introduction

Nodevel's test harness dispatches requests through the router in-process — no network involved.

```js
const { createTestApp } = require('../bootstrap');

const ctx = await createTestApp();
const response = await ctx.get('/');
assertEqual(response.status(), 200);
```

<a name="making-requests"></a>
## Making Requests

| Method                       | Sends                        |
| ---------------------------- | ---------------------------- |
| `ctx.get(uri)`               | GET                          |
| `ctx.post(uri, options)`     | POST                         |
| `ctx.put(uri, options)`      | PUT                          |
| `ctx.patch(uri, options)`    | PATCH                        |
| `ctx.delete(uri)`            | DELETE                       |

Options:

```js
await ctx.post('/form', { form: { name: 'Taylor' } });
await ctx.getJson('/api/users');           // accept: application/json
```

Inspecting responses:

```js
response.status()          // status code
response.content()         // raw body string
response.json('user.name') // dot-notation JSON access
```

<a name="testing-json-apis"></a>
## Testing JSON APIs

```js
router.get('/api/ping', () => ({ pong: true }));

const res = await ctx.getJson('/api/ping');
assertEqual(res.status(), 200);
assertEqual(res.json('pong'), true);
```

<a name="session-and-authentication"></a>
## Session And Authentication

Act as a user without going through login:

```js
ctx.actAs(user);
const res = await ctx.get('/dashboard');
```

Each call boots a fresh session store; cookies set during a request are available on subsequent ones via `ctx.withCookies(...)`.
