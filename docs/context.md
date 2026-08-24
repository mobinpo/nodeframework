# Context

- [Introduction](#introduction)
- [Capturing Context](#capturing-context)
- [Log Context](#log-context)

<a name="introduction"></a>
## Introduction

Context attaches shared metadata (request IDs, tenant identifiers) to everything that happens during one request or job execution.

<a name="capturing-context"></a>
## Capturing Context

Use an `AsyncLocalStorage`-backed store from framework support:

```js
const { withContext } = require('@nodevel/framework/src/Support/Context');

await withContext({ requestId: crypto.randomUUID() }, async () => {
    // Everything logged in here carries requestId.
    await handleRequest(request);
});
```

Middleware is the natural place to open a context:

```js
async function handle(request, next) {
    return withContext({ requestId }, () => next(request));
}
```

<a name="log-context"></a>
## Log Context

The logger merges active context into every record automatically:

```js
app.make('log').info('Payment processed');
// {"level":"info","message":"...","requestId":"..."}
```

Retrieve values explicitly when needed:

```js
const { getContext } = require('@nodevel/framework/src/Support/Context');
getContext('requestId');
```
