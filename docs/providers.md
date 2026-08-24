# Service Providers

- [Introduction](#introduction)
- [Writing Service Providers](#writing-service-providers)
    - [The Register Method](#the-register-method)
    - [The Boot Method](#the-boot-method)
- [Registering Providers](#registering-providers)

<a name="introduction"></a>
## Introduction

Service providers are the central place to bootstrap your application. The framework itself boots its core services (database, cache, session, routing) through internal providers; your own bindings, event listeners, middleware aliases, and rate limiters belong in providers too.

<a name="writing-service-providers"></a>
## Writing Service Providers

All providers extend the base `ServiceProvider` class:

```js
'use strict';

const ServiceProvider = require('@nodevel/framework').ServiceProvider;

class RateLimitServiceProvider extends ServiceProvider {
    register() {
        // Bind things into the container — keep it lean.
    }

    async boot() {
        this.app.make('ratelimiter').for('api', (request) => ({
            max: 60,
            decay: 60,
            key: request.ip(),
            limiter: 'api',
        }));
    }
}

module.exports = RateLimitServiceProvider;
```

<a name="the-register-method"></a>
### The Register Method

`register()` runs first for **every** provider before any `boot()` runs, so you can safely depend on other providers' bindings being registered. Only bind things into the container here; never resolve services that might not exist yet.

<a name="the-boot-method"></a>
### The Boot Method

`boot()` runs after all providers have registered. This method receives nothing but has full access to every service in the container: register broadcast channels, view composers, route model bindings, and rate limiters here.

<a name="registering-providers"></a>
## Registering Providers

List provider classes in `bootstrap/providers.js`; they load on every boot:

```js
module.exports = [
    require('../app/Providers/AppServiceProvider'),
];
```
