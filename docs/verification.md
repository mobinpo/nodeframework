# Email Verification

- [Introduction](#introduction)
- [Model Preparation](#model-preparation)
- [Protecting Routes](#protecting-routes)
- [Sending Verification Links](#sending-verification-links)

<a name="introduction"></a>
## Introduction

Many applications require users to verify their email before using the app. Nodevel stores verification state on the `email_verified_at` timestamp column of the users table.

<a name="model-preparation"></a>
## Model Preparation

The column exists in the default migration. Mark a user as verified:

```js
await db.table('users')
    .where('id', user.getKey())
    .update({ email_verified_at: new Date().toISOString() });
```

<a name="protecting-routes"></a>
## Protecting Routes

Apply the `verified` middleware alias (registered in `bootstrap/app.js`) alongside auth:

```js
Route.group({ middleware: ['auth', 'verified'] }, () => {
    Route.get('/dashboard', handler);
});
```

Unverified authenticated users receive a 403 response.

<a name="sending-verification-links"></a>
## Sending Verification Links

Issue a signed token and mail it:

```js
const token = require('crypto').randomBytes(32).toString('hex');
await app.make('cache').put(`verify:${token}`, user.getKey(), 3600);

const link = `${process.env.APP_URL}/verify-email?token=${token}`;
// Send $link via the Mail facade...
```

The receiving route validates the token, stamps `email_verified_at`, and redirects the user into the app.
