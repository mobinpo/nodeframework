# Mocking

- [Introduction](#introduction)
- [Mocking Facades](#mocking-facades)
- [Mocking The Queue And Mail](#mocking-the-queue-and-mail)

<a name="introduction"></a>
## Introduction

When testing, you often want to prevent real side effects (emails sent, jobs pushed). Because facades resolve services out of the container, replacing them is trivial.

<a name="mocking-facades"></a>
## Mocking Facades

Every facade supports `swap`, which binds a fake instance into the container:

```js
const { Cache } = require('@nodevel/framework').Facades;
const app = ...;

class FakeCache {
    get(key) { return 'fake-value'; }
}
app.instance('cache', new FakeCache());
```

The proxy-based facades also expose `shouldReceive` recording:

```js
Cache.shouldReceive('get');   // records calls instead of hitting the store
```

<a name="mocking-the-queue-and-mail"></a>
## Mocking The Queue And Mail

Queue faking keeps jobs from running while letting you assert they were pushed:

```js
const Queue = require('@nodevel/framework/src/Queue/QueueManager');
// In tests, bind the sync connection so dispatches run inline:
app.configRepository.set('queue.default', 'sync');
```

Mail faking captures mailables instead of sending them:

```js
app.configRepository.set('mail.driver', 'array');
const sent = app.make('mailer').sentMessages();
assertEqual(sent.length, 1);
```

Prefer asserting observable state (database rows, queue payloads) over deep mocks — see [HTTP tests](/docs/http-tests).
