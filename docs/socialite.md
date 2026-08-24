# Socialite OAuth Login

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Implementing "Login With X"](#implementing-login-with-x)

<a name="introduction"></a>
## Introduction

Laravel Socialite provides an expressive interface to OAuth authentication with third-party providers (GitHub, Google, etc.).

<a name="nodevel-status"></a>
## Nodevel Status

Not bundled. The HTTP client plus the session layer implement the redirect-flow in about thirty lines per provider.

<a name="implementing-login-with-x"></a>
## Implementing "Login With X"

```js
// routes/web.js
const { Route } = require('@nodevel/framework').Facades;
const { User } = require('../app/Models/User');

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

Route.get('/auth/github', () => {
    const redirectUri = encodeURIComponent(url('/auth/github/callback'));
    return response()->make('', 302, {
        location: `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}`,
    });
});

Route.get('/auth/github/callback', async (request) => {
    const http = app().make('http.client');

    // Exchange the authorization code for an access token.
    const tokenResponse = await http
        .withHeaders({ accept: 'application/json' })
        .post('https://github.com/login/oauth/access_token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: request.query('code'),
        });

    // Fetch the profile.
    const profile = await http
        .withToken(tokenResponse.json('access_token'))
        .get('https://api.github.com/user');

    // Find or create the local user, then log them into the session guard.
    let user = await User.where('email', profile.json('email')).first();
    if (!user) {
        user = await User.create({
            name: profile.json('name') || profile.json('login'),
            email: profile.json('email'),
            password: Str.random(32),
        });
    }
    auth().login(user);

    return redirect()->to('/dashboard');
});
```

The `auth().login(user)` call stores the id in the encrypted session cookie, so every subsequent request resolves through the standard `auth` middleware.
