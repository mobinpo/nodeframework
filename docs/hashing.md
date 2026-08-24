# Hashing

- [Introduction](#introduction)
- [Configuration](#configuration)
- [Basic Usage](#basic-usage)

<a name="introduction"></a>
## Introduction

Nodevel's `Hash` facade provides secure Bcrypt hashing for storing user passwords. If you prefer, the fallback scrypt implementation uses Node's built-in crypto — no native compilation required.

<a name="configuration"></a>
## Configuration

The default hashing driver is configured in `config/hashing.js` (or defaults to `bcrypt`). Cost rounds are tunable per driver.

<a name="basic-usage"></a>
## Basic Usage

Hash a password by calling `make`:

```js
const Hash = require('@nodevel/framework').Facades.Hash;
const hashed = await Hash.make(request.input('password'));
```

Verify a value against its hash with `check`:

```js
if (await app().make('hash').check('plain-text', hashed)) {
    // Password matches...
}
```

The auth guard's `attempt` uses `check` internally, so password verification is consistent everywhere.

> **Note:** hashes are one-way — there is no reverse operation. When upgrading hash parameters, re-hash on successful login.
