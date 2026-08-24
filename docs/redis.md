# Redis

- [Introduction](#introduction)
- [Configuration](#configuration)
- [Usage With Cache And Queues](#usage-with-cache-and-queues)

<a name="introduction"></a>
## Introduction

Redis is an advanced key-value store. In Nodevel it backs caches, queues, and sessions through a shared connection manager.

<a name="configuration"></a>
## Configuration

Configure via `.env`:

```ini
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
CACHE_STORE=redis
QUEUE_CONNECTION=redis
```

Install the driver package:

```shell
npm install ioredis
```

Connections live in `config/database.js` under the `redis` key.

<a name="usage-with-cache-and-queues"></a>
## Usage With Cache And Queues

Once configured, the cache and queue services route through Redis transparently:

```js
await app.make('cache').store('redis').put('key', value, 600);
```

Queue workers then consume Redis-backed jobs:

```shell
node artisan queue:work redis
```

Atomic locks (used by unique jobs and rate limiters) require a lock-capable store such as Redis.
