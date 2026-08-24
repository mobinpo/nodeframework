# Authentication

- [Introduction](#introduction)
- [Authentication Quickstart](#authentication-quickstart)
    - [The User Model](#the-user-model)
    - [Retrieving the Authenticated User](#retrieving-the-authenticated-user)
    - [Protecting Routes](#protecting-routes)
    - [Logging Out](#logging-out)
- [Manually Authenticating Users](#manually-authenticating-users)
    - [Remembering Users](#remembering-users)

<a name="introduction"></a>
## Introduction

Nodevel ships with session-based authentication out of the box. Login stores the user's id in the encrypted session cookie; API clients authenticate with Bearer tokens through Sanctum.

<a name="authentication-quickstart"></a>
## Authentication Quickstart

<a name="the-user-model"></a>
### The User Model

The `User` model in `app/Models/User.js` is bound to the container as `auth.model`. Passwords hash via the `hash` service:

```js
const hashed = await app().make('hash').make(request.input('password'));
```

<a name="retrieving-the-authenticated-user"></a>
### Retrieving the Authenticated User

```js
Route.get('/user', async (request) => {
    const user = await auth().user();
    return { id: user?.getKey() };
});
```

`auth().check()` returns whether a user is authenticated; `auth().guest()` its inverse.

<a name="protecting-routes"></a>
### Protecting Routes

Guard routes with an `auth` middleware:

```js
class Authenticate {
    async handle(request, next) {
        if (!(await auth().check())) {
            return redirect('/login');
        }
        return next(request);
    }
}
```

```js
Route.group({ middleware: ['auth'] }, () => {
    Route.get('/dashboard', handler);
});
```

<a name="logging-out"></a>
### Logging Out

Remove the login id from the session:

```js
auth().logout();
```

<a name="manually-authenticating-users"></a>
## Manually Authenticating Users

Attempt credentials and log the user in on success:

```js
const ok = await auth().attempt({
    email: request.input('email'),
    password: request.input('password'),
});

if (!ok) {
    return response().json({ message: 'Invalid credentials' }, 422);
}
return redirect('/dashboard');
```

`attempt` looks up the model by the first credential column (typically `email`) and verifies the password with the configured hasher.

<a name="remembering-users"></a>
### Remembering Users

Because authentication rides on the framework session, "remember me" behavior is achieved by extending `session.lifetime` in `config/session.js` for users who opt in at login.
