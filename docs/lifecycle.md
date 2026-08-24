# Request Lifecycle

- [Introduction](#introduction)
- [Lifecycle Overview](#lifecycle-overview)
    - [First Steps](#first-steps)
    - [HTTP / Console Kernels](#http-console-kernels)
    - [Service Providers](#service-providers)
    - [Routing](#routing)
    - [Finishing Up](#finishing-up)

<a name="introduction"></a>
## Introduction

When using any tool in the "real world", you feel more confident if you understand how that tool works. This document gives you a good, high-level overview of how the Nodevel framework works.

<a name="lifecycle-overview"></a>
## Lifecycle Overview

<a name="first-steps"></a>
### First Steps

The entry point for all requests to a Nodevel application is the HTTP server started by `node bin/artisan.js serve` (or any Node HTTP server wired to the kernel). Each incoming request is captured into a framework `Request` object — an enriched wrapper around Node's `IncomingMessage`.

The first action taken by Nodevel is to create (or reuse) the application / [service container](container.md) instance and load `.env` plus the `config/` files.

<a name="http-console-kernels"></a>
### HTTP / Console Kernels

Next, the incoming request is sent to the HTTP kernel (`src/Foundation/HttpKernel.js`), or console input to Artisan. The kernel:

1. Checks maintenance mode and short-circuits with 503 when down.
2. Captures the request body according to its content type.
3. Starts (or resumes) the session.
4. Hands the request to the router for dispatching through global middleware.

Think of the kernel as a big black box representing your entire application: feed it HTTP requests, receive HTTP responses.

<a name="service-providers"></a>
### Service Providers

Service providers are responsible for bootstrapping all of the framework's components. Nodevel instantiates every provider listed in `bootstrap/providers.js`, calls `register()` on all of them so every container binding exists, then calls `boot()`. Your `AppServiceProvider` is a great place for application bindings and route-model registrations.

<a name="routing"></a>
### Routing

The router matches the request against registered routes and dispatches it through the matched route's middleware pipeline. Middleware can examine or filter requests — verifying authentication, CSRF tokens, or rate limits — before the controller or closure runs. The returned value is normalized into a `Response`: strings become HTML, objects/arrays become JSON, views render HTML, and `Response` instances pass through untouched.

If no route matches, a 404 response is produced via the fallback handler or exception renderer.

<a name="finishing-up"></a>
### Finishing Up

Once the response travels back outward through the middleware chain, the kernel saves the session (rotating flash data), attaches the session cookie, and writes status, headers, cookies, and content to the Node `ServerResponse`. Uncaught exceptions are converted into debug or generic error responses depending on your `APP_DEBUG` setting.
