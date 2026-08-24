# Rate Limiting

- [Introduction](#introduction)
- [Defining Rate Limiters](#defining-rate-limiters)
- [Attaching To Routes](#attaching-to-routes)

<a name="introduction"></a>
## Introduction

Rate limiting protects expensive endpoints from abuse. Limiters use the cache store's atomic counters, so they work across worker processes sharing one cache.

<a name="defining-rate-limiters"></a>
## Defining Rate Limiters

Define named limiters in a service provider's `boot`:

```js
const RateLimiter = require('@nodevel/framework/src/Cache/RateLimiter');

RateLimiter.for('api', () => ({ maxAttempts: 60, decaySeconds: 60 }));
```

Segment by user or IP via the `by` key:

```js
RateLimiter.for('uploads', (request) => ({
    maxAttempts: 10,
    decaySeconds: 3600,
    key: request.ip(),
}));
```

<a name="attaching-to-routes"></a>
## Attaching To Routes

Apply the built-in `throttle` middleware with a limiter name:

```js
Route.get('/search', handler).middleware('throttle:api');
```

Or inline limits:

```js
Route.get('/heavy', handler).middleware('throttle:5,1');   // 5 per minute
```

Exceeded requests receive a 429 response with a `retry-after` header.
