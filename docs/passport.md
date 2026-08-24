# Passport (OAuth)

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Issuing API Tokens Today](#issuing-api-tokens-today)

<a name="introduction"></a>
## Introduction

Laravel Passport is a full OAuth2 server implementation (authorization codes, client credentials, refresh tokens).

<a name="nodevel-status"></a>
## Nodevel Status

Not implemented. For first-party single-page or mobile applications, Nodevel ships Sanctum-style personal access tokens which cover the common cases without OAuth2's complexity.

<a name="issuing-api-tokens-today"></a>
## Issuing API Tokens Today

```js
const { Sanctum } = require('@nodevel/framework').Auth;

// Issue
const { plainTextToken } = await Sanctum.createToken(user, 'mobile', ['read', 'write']);

// Authenticate — the session guard falls back to bearer tokens automatically:
// Authorization: Bearer <plainTextToken>

// Check abilities on the current request
const allowed = await Sanctum.tokenCan(user, 'write', app);

// Revoke everything for a user
await Sanctum.revokeAllTokensFor(user, app);
```

Tokens are stored hashed (SHA-256) in `personal_access_tokens` with abilities and expiry; see [sanctum](/framework/docs/sanctum) for the full reference.
