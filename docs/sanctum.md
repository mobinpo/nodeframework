# Nodevel Sanctum

- [Introduction](#introduction)
    - [How it Works](#how-it-works)
- [Installation](#installation)
- [API Token Authentication](#api-token-authentication)
    - [Issuing API Tokens](#issuing-api-tokens)
    - [Protecting Routes](#protecting-routes)
    - [Revoking Tokens](#revoking-tokens)
    - [Token Expiration](#token-expiration)
- [Mobile Application Authentication](#mobile-application-authentication)

<a name="introduction"></a>
## Introduction

Nodevel Sanctum provides a featherweight authentication system for SPAs (single page applications), mobile applications, and simple token based APIs. Sanctum allows each user of your application to generate multiple API tokens; tokens may be granted abilities / scopes specifying which actions they may perform.

<a name="how-it-works"></a>
### How it Works

Tokens are stored in a `personal_access_tokens` database table. Incoming requests are authenticated via the `Authorization` header containing a valid token:

```text
Authorization: Bearer 1|abcdef0123456789...
```

Plain-text tokens are shown once at creation; only SHA-256 hashes are stored.

<a name="installation"></a>
## Installation

Create the table with the provided migration, then bind your User model to the container (`auth.model`). The migration shipped with this skeleton creates both `personal_access_tokens` and `notifications`.

<a name="issuing-api-tokens"></a>
### Issuing API Tokens

```js
const { Sanctum } = require('@nodevel/framework').Auth;

const { plainTextToken } = await Sanctum.createToken(
    user,
    'token-name',
    ['server:update']
);

// Display plainTextToken to the user immediately — it cannot be retrieved again.
```

Check abilities on the authenticated request:

```js
if (await Sanctum.tokenCan(user, 'server:update', app)) {
    // ...
}
```

<a name="protecting-routes"></a>
### Protecting Routes

The session guard automatically falls back to bearer-token authentication for API clients, so routes protected by an auth middleware accept both cookies and tokens:

```js
Route.get('/user', async (request) => request.user());
```

<a name="revoking-tokens"></a>
### Revoking Tokens

```js
await Sanctum.revokeAllTokensFor(user, app);
```

Or delete specific rows from the `personal_access_tokens` table through the query builder.

<a name="token-expiration"></a>
### Token Expiration

Pass an expiration date as the fourth argument to `createToken`; expired tokens fail authentication automatically:

```js
Sanctum.createToken(user, 'token-name', ['*'], new Date(Date.now() + 7 * 864e5));
```

<a name="mobile-application-authentication"></a>
## Mobile Application Authentication

Exchange credentials for a token on a login endpoint:

```js
Route.post('/sanctum/token', async (request) => {
    const validated = Validator.validate(request.all(), {
        email: 'required|email',
        password: 'required',
        device_name: 'required',
    });

    const user = await User.query().where('email', validated.email).first();

    if (!user || !(await app.make('hash').check(validated.password, user.attributes.password))) {
        return response().json({ message: 'Invalid credentials' }, 422);
    }

    const { plainTextToken } = await Sanctum.createToken(user, validated.device_name);
    return { token: plainTextToken };
});
```

The mobile client stores the token and sends it as a Bearer header on every API request.
