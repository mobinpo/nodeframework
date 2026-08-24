# Password Reset

- [Introduction](#introduction)
- [Resetting Flow](#resetting-flow)
- [Database Considerations](#database-considerations)

<a name="introduction"></a>
## Introduction

Nodevel's password broker issues password reset tokens and verifies them during resets. The `password_reset_tokens` table (created by the default users migration) stores tokens.

<a name="resetting-flow"></a>
## Resetting Flow

1. Request a reset — create a token bound to the user's email.
2. Email the user a link containing the token.
3. On submit, verify the token and update the password.

```js
const db = app.make('db');
const crypto = require('crypto');

// Issue
const token = crypto.randomBytes(32).toString('hex');
await db.table('password_reset_tokens').insert({
    email,
    token: app.make('hash').make(token),
});

// Verify + reset
const row = await db.table('password_reset_tokens').where('email', email).first();
if (!row || !verify(row.token, token)) throw invalidError;

await db.table('users').where('email', email).update({ password: newPassword });
await db.table('password_reset_tokens').where('email', email).delete();
```

Hash stored tokens — a database leak must not leak usable links.

Tokens should expire; delete rows older than your window (60 minutes is typical):

```js
await db.table('password_reset_tokens')
    .whereRaw(`created_at < datetime('now', '-60 minutes')`)
    .delete();
```

<a name="database-considerations"></a>
## Database Considerations

One active token per user: replace any existing row when issuing a fresh token.
