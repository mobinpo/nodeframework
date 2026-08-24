# Cache

- [Introduction](#introduction)
- [Configuration](#configuration)
- [Cache Usage](#cache-usage)
    - [Obtaining a Cache Instance](#obtaining-a-cache-instance)
    - [Retrieving Items From the Cache](#retrieving-items-from-the-cache)
    - [Storing Items in the Cache](#storing-items-in-the-cache)
    - [Removing Items From the Cache](#removing-items-from-the-cache)

<a name="introduction"></a>
## Introduction

Caching expensive queries or remote API calls can dramatically improve application performance. Nodevel provides a unified API across `array`, `file`, and `redis` drivers.

<a name="configuration"></a>
## Configuration

All cache configuration lives in `config/cache.js`. The `default` store names the driver used globally:

| Driver  | Description                                        |
| ------- | -------------------------------------------------- |
| `array` | In-process memory; per-request lifetime.           |
| `file`  | Serialized values under `storage/framework/cache`. |
| `redis` | Shared, fast store (requires `ioredis`).           |

<a name="cache-usage"></a>
## Cache Usage

<a name="obtaining-a-cache-instance"></a>
### Obtaining a Cache Instance

```js
const cache = app().make('cache').store();          // default store
const redis = app().make('cache').store('redis');   // named store
```

The global `Cache` facade and `app().make('cache')` proxy to the default store.

<a name="retrieving-items-from-the-cache"></a>
### Retrieving Items From the Cache

```js
const value = await cache.get('key', 'default');

// Compute-and-store in one call:
const stats = await cache.remember('stats', 300, async () => {
    return await app().make('db').table('orders').count();
});
```

Expired items return the default. `increment(key)` / atomic counters work on every driver.

<a name="storing-items-in-the-cache"></a>
### Storing Items in the Cache

```js
await cache.put('key', 'value', 600);   // seconds
await cache.put('key', 'value');        // forever
```

<a name="removing-items-from-the-cache"></a>
### Removing Items From the Cache

```js
await cache.forget('key');
await cache.flush();                    // wipe the whole store
```

Or from the CLI:

```shell
node bin/artisan.js cache:clear
```
