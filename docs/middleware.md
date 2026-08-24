# Middleware

- [Introduction](#introduction)
- [Defining Middleware](#defining-middleware)
- [Registering Middleware](#registering-middleware)
    - [Global Middleware](#global-middleware)
    - [Assigning Middleware to Routes](#assigning-middleware-to-routes)
    - [Middleware Groups](#middleware-groups)
    - [Sorting Middleware](#sorting-middleware)
- [Middleware Parameters](#middleware-parameters)

<a name="introduction"></a>
## Introduction

Middleware provide a convenient mechanism for inspecting and filtering HTTP requests entering your application. For example, Nodevel includes middleware that verifies authentication, validates CSRF tokens, and serves maintenance-mode responses.

<a name="defining-middleware"></a>
## Defining Middleware

Create middleware with Artisan:

```shell
npx tsx bin/artisan.ts make:middleware EnsureTokenIsValid
```

A middleware's `handle` method receives the request and a `next` closure; call `next(request)` to pass the request deeper:

```js
'use strict';

class EnsureTokenIsValid {
    async handle(request, next) {
        if (request.input('token') !== 'my-secret-token') {
            return response().json({ message: 'Invalid token' }, 403);
        }
        return next(request);
    }
}

module.exports = { default: EnsureTokenIsValid, EnsureTokenIsValid };
```

Middleware may run before **or** after the rest of the pipeline depending on whether code sits before or after the `next` call.

<a name="registering-middleware"></a>
## Registering Middleware

<a name="global-middleware"></a>
### Global Middleware

Global middleware run on every request. Register them when configuring the application:

```js
app.withGlobalMiddleware(['maintenance', 'session', 'csrf']);
```

<a name="assigning-middleware-to-routes"></a>
### Assigning Middleware to Routes

Pass names to a route's `middleware` method:

```js
Route.get('/profile', handler).middleware('auth');
Route.post('/upload', handler).middleware(['auth', 'throttle:uploads']);
```

String names resolve through the container as `middleware.<name>` bindings — register your aliases in a service provider:

```js
app.bind('middleware.auth', () => new AuthenticateMiddleware());
```

<a name="middleware-groups"></a>
### Middleware Groups

Group related routes sharing middleware:

```js
Route.group({ middleware: ['auth', 'verified'] }, () => {
    Route.get('/dashboard', handler);
});
```

<a name="sorting-middleware"></a>
### Sorting Middleware

Global middleware execute in registration order; route middleware follow them in listed order.

<a name="middleware-parameters"></a>
## Middleware Parameters

Extra parameters after a colon are passed to `handle`:

```js
Route.post('/video', handler).middleware('throttle:10,1');
```

```js
async handle(request, next, maxAttempts = 60, decayMinutes = 1) {
    // ...
}
```
