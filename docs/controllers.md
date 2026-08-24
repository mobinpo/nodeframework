# Controllers

- [Introduction](#introduction)
- [Writing Controllers](#writing-controllers)
    - [Basic Controllers](#basic-controllers)
- [Actions Handled By Controller](#actions-handled-by-controller)
- [Controller Middleware](#controller-middleware)

<a name="introduction"></a>
## Introduction

Instead of defining all of your request handling logic as closures in your route files, you may organize this behavior using "controller" classes. Controllers live in `app/Http/Controllers`.

<a name="writing-controllers"></a>
## Writing Controllers

<a name="basic-controllers"></a>
### Basic Controllers

Generate a controller with Artisan:

```shell
node artisan make:controller UserController
```

This creates `app/Http/Controllers/UserController.js`:

```js
'use strict';

class UserController {
    async show(request, id) {
        return 'User ' + id;
    }
}

module.exports = { default: UserController, UserController };
```

Register a route that points at it:

```js
const Route = require('@nodevel/framework').Route;

Route.get('/users/{id}', 'UserController@show').whereNumber('id');
```

Incoming requests with matching URIs are dispatched to the controller's method. Route parameters are passed positionally after the request.

<a name="actions-handled-by-controller"></a>
## Actions Handled By Controller

A resource controller handles all CRUD actions for a single model:

```shell
node artisan make:controller PhotoController --resource
```

| Verb      | URI                  | Action   | Route Name       |
| --------- | -------------------- | -------- | ---------------- |
| GET       | `/photos`            | index    | photos.index     |
| POST      | `/photos`            | store    | photos.store     |
| GET       | `/photos/{id}`       | show     | photos.show      |
| PUT/PATCH | `/photos/{id}`       | update   | photos.update    |
| DELETE    | `/photos/{id}`       | destroy  | photos.destroy   |

```js
Route.resource('photos', 'PhotoController');
```

<a name="controller-middleware"></a>
## Controller Middleware

Assign middleware in routes files:

```js
Route.get('/profile', 'ProfileController@show').middleware('auth');
```

You may apply middleware to every controller action via route groups:

```js
Route.group({ middleware: ['auth'] }, () => {
    Route.get('/profile', 'ProfileController@show');
});
```
