# Testing: Getting Started

- [Introduction](#introduction)
- [Environment](#environment)
- [Creating Tests](#creating-tests)
- [Running Tests](#running-tests)

<a name="introduction"></a>
## Introduction

Nodevel is built with testing in mind. The framework ships with a tiny test runner (`npx tsx bin/artisan.ts test`), assertion helpers, and an in-process HTTP client so feature tests can hit your routes without a network.

By default, the `tests` directory contains two directories: `Feature` and `Unit`. Unit tests focus on small, isolated pieces of code. Feature tests exercise larger portions of the system — even full requests through the router.

**Generally, most of your tests should be feature tests**, since they provide the most confidence that the system as a whole functions as intended.

<a name="environment"></a>
## Environment

When running tests, Nodevel automatically sets `APP_ENV=testing` via `tests/bootstrap.js` and swaps session storage to an in-memory driver so no data persists between runs.

You may create a `.env.testing` file; it is used when `APP_ENV=testing`.

<a name="creating-tests"></a>
## Creating Tests

Generate tests with Artisan:

```shell
npx tsx bin/artisan.ts make:test UserTest          # tests/Feature
npx tsx bin/artisan.ts make:test MathTest --unit   # tests/Unit
```

A test file exports a `tests` array of cases:

```js
'use strict';

module.exports.tests = [
    {
        name: 'two plus two is four',
        async fn() {
            assertEqual(2 + 2, 4);
        },
    },
];
```

Each case supports optional `setup()` / `teardown()` hooks awaited before and after `fn()`.

<a name="running-tests"></a>
## Running Tests

```shell
npx tsx bin/artisan.ts test                       # run everything
npx tsx bin/artisan.ts test --filter=routing      # by name substring
npx tsx bin/artisan.ts test --stop-on-failure     # halt at first failure
npx tsx bin/artisan.ts test --profile             # show slowest tests
npx tsx bin/artisan.ts test UserTest              # single file
```

The runner reports passed/failed counts, duration, and prints stack traces for failures with a non-zero exit code on failure (CI-friendly).

<a name="feature-test-helpers"></a>
### Feature Test Helpers

Feature tests boot the application through `tests/bootstrap.js` and receive a context with HTTP helpers:

```js
const { createTestApp } = require('../bootstrap');

let ctx;

module.exports.tests = [
    {
        name: 'welcome page renders',
        async setup() {
            ctx = ctx || (await createTestApp());
        },
        async fn() {
            const response = await ctx.get('/');
            response.assertOk();
            response.assertSee('Nodevel');
        },
    },
];
```

Available request methods: `get`, `post`, `put`, `patch`, `delete`, `getJson`, `postJson`, `deleteJson`. Available assertions: `assertStatus`, `assertOk`, `assertNotFound`, `assertForbidden`, `assertUnauthorized`, `assertSee`, `assertDontSee`, `assertRedirect`, `assertJsonPath`, `assertJsonFragment`.

Authenticate subsequent requests with `actingAs(user)` — the Sanctum-style helper.
