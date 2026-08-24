# Facades

- [Introduction](#introduction)
- [When to Utilize Facades](#when-to-use-facades)
- [How Facades Work](#how-facades-work)
- [Facade Class Reference](#facade-class-reference)

<a name="introduction"></a>
## Introduction

Facades provide a "static" interface to classes available in the application's service container. Nodevel ships facades for almost all of its features:

```js
const { Cache, Route } = require('@nodevel/framework').Facades;

Route.get('/cache', async () => {
    return Cache.get('key');
});
```

Nodevel also offers global helper functions that complement the facades — `view`, `response`, `url`, `config`, `env`, `session`, `auth`, `redirect`, `event`. There is no practical difference between a facade and its helper.

<a name="when-to-use-facades"></a>
## When to Use Facades

Facades have many benefits: terse, memorable syntax without remembering long class names, easy testability (swap instances with `Facade.swap(instance)`), and zero setup. The primary danger is scope creep — because injection is not required it is easy to pile many facades into one class. If your class grows too large, consider splitting it.

<a name="how-facades-work"></a>
## How Facades Work

Every facade is a JavaScript `Proxy` around the container binding named by its accessor. A "static" call like `Cache.get('key')` resolves the `cache` binding from the container and invokes `get` on that instance — so mocking and swapping work just like with injected dependencies:

```js
// In tests: swap in a fake.
Cache.swap({ get: async () => 'value' });
```

<a name="facade-class-reference"></a>
## Facade Class Reference

| Facade      | Container Binding | Underlying Service                  |
| ----------- | ----------------- | ----------------------------------- |
| App         | `app`             | Application / container             |
| Route       | `router`          | Router                              |
| DB          | `db`              | Database manager                    |
| Schema      | `db.schema`       | Schema builder                      |
| Config      | `config`          | Configuration repository            |
| Cache       | `cache`           | Cache manager                       |
| Session     | `session`         | Session manager                     |
| Auth        | `auth`            | Auth manager                        |
| Crypt       | `encrypter`       | Encrypter                           |
| Hash        | `hash`            | Password hasher                     |
| Log         | `log`             | Log manager                         |
| Mail        | `mailer`          | Mailer                              |
| Queue       | `queue`           | Queue manager                       |
| Storage     | `storage`         | Filesystem manager                  |
| Broadcast   | `broadcast`       | Broadcast manager                   |
| View        | `view`            | View factory                        |
| Validator   | `validator`       | Validator                           |
| Event       | `events`          | Event dispatcher                    |
| Artisan     | `artisan`         | Console application                 |
| URL         | `url`             | URL generator                       |
| RateLimiter | `ratelimiter`     | Rate limiter registry               |
