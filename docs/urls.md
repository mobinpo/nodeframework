# URLs

- [Introduction](#introduction)
- [Generating URLs](#generating-base-urls)
- [Named Routes](#named-routes)

<a name="introduction"></a>
## Introduction

The URL service builds links consistently across your application.

```js
const url = app.make('url');
```

<a name="generating-base-urls"></a>
## Generating Base URLs

```js
url.to('/users');            // http://localhost/users (respects APP_URL)
url.current();               // full URL of the current request
url.previous();              // referer when present
```

Set `APP_URL` in `.env` so generated links match production domains:

```ini
APP_URL=https://example.com
```

<a name="named-routes"></a>
## Named Routes

Name routes once:

```js
Route.get('/users/{id}', handler).name('users.show');
```

Then generate from names — parameter substitution included:

```js
app.make('url').route('users.show', { id: 7 }, false); // /users/7
```

Passing `true` as the third argument returns the absolute URL:

```js
url.route('users.show', { id: 7 });   // https://example.com/users/7
```
