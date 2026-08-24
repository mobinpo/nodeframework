# Routing

- [Basic Routing](#basic-routing)
    - [The Default Route Files](#the-default-route-files)
    - [Redirect Routes](#redirect-routes)
    - [View Routes](#view-routes)
    - [Listing Your Routes](#listing-your-routes)
- [Route Parameters](#route-parameters)
    - [Required Parameters](#required-parameters)
    - [Regular Expression Constraints](#parameters-regular-expression-constraints)
- [Named Routes](#named-routes)
- [Route Groups](#route-groups)
    - [Middleware](#route-group-middleware)
    - [Route Prefixes](#route-group-prefixes)
    - [Route Name Prefixes](#route-group-name-prefixes)
- [Model Binding](#model-binding)
- [Fallback Routes](#fallback-routes)
- [Rate Limiting](#rate-limiting)
- [Accessing the Current Route](#accessing-the-current-route)

<a name="basic-routing"></a>
## Basic Routing

The most basic Nodevel routes accept a URI and a closure, providing a very simple and expressive method of defining routes and behavior without complicated routing configuration files:

```js
const { Route } = require('@nodevel/framework').Facades;

Route.get('/greeting', () => 'Hello World');
```

<a name="the-default-route-files"></a>
### The Default Route Files

All Nodevel routes are defined in your route files, which are located in the `routes` directory. These files are automatically loaded by your application's service provider. The `routes/web.js` file defines routes that are for your web interface.

```js
const { Route } = require('@nodevel/framework').Facades;
const UserController = require('../app/Http/Controllers/UserController');

Route.get('/user', [UserController, 'index']);
```

<a name="available-router-methods"></a>
### Available Router Methods

The router allows you to register routes that respond to any HTTP verb:

```js
Route.get(uri, action);
Route.post(uri, action);
Route.put(uri, action);
Route.patch(uri, action);
Route.delete(uri, action);
Route.options(uri, action);
```

Sometimes you may need to register a route that responds to multiple HTTP verbs — use `match`, or all verbs with `any`:

```js
Route.match(['get', 'post'], '/', handler);
Route.any('/', handler);
```

<a name="dependency-injection"></a>
### Dependency Injection

Controllers resolved through `[ControllerClass, 'method']` actions are built by the service container, so dependencies declared via `static inject` are injected automatically:

```js
class UserController {
    static inject = ['db'];
    constructor(db) { this.db = db; }
    async index(request) {
        return this.db.table('users').get();
    }
}
module.exports = { default: UserController, UserController };
```

<a name="redirect-routes"></a>
### Redirect Routes

If you are defining a route that redirects to another URI, you may use the `Route.redirect` method:

```js
Route.redirect('/here', '/there');       // 302
Route.permanentRedirect('/here', '/there'); // 301
```

<a name="view-routes"></a>
### View Routes

If your route only needs to return a view, you may use the `Route.view` method:

```js
Route.view('/welcome', 'welcome', { name: 'Taylor' });
```

<a name="listing-your-routes"></a>
### Listing Your Routes

The `route:list` Artisan command can easily provide an overview of all of the routes that are defined by your application:

```shell
node bin/artisan.js route:list
node bin/artisan.js route:list --path=api
```

<a name="route-parameters"></a>
## Route Parameters

<a name="required-parameters"></a>
### Required Parameters

Sometimes you will need to capture segments of the URI within your route. Route parameters are always encased within `{}` braces and are passed as arguments after the request:

```js
Route.get('/posts/{post}/comments/{comment}', (request, postId, commentId) => {
    // ...
});
```

<a name="parameters-optional-parameters"></a>
### Optional Parameters

Occasionally you may need to specify a route parameter that may not always be present in the URI. Place a `?` mark after the parameter name:

```js
Route.get('/user/{name?}', (request, name) => name ?? 'John');
```

<a name="parameters-regular-expression-constraints"></a>
### Regular Expression Constraints

You may constrain the format of your route parameters using the `where` method on a route instance:

```js
Route.get('/user/{name}', handler).where('name', '[A-Za-z]+');
Route.get('/user/{id}', handler).whereNumber('id');
Route.get('/category/{category}', handler).whereIn('category', ['movie', 'song']);
```

Convenience constraint methods include `whereNumber`, `whereAlpha`, `whereAlphaNumeric`, `whereUuid`, `whereUlid`, and `whereIn`.

If the incoming request does not match the route pattern constraints, a 404 HTTP response will be returned.

<a name="named-routes"></a>
## Named Routes

Named routes allow the convenient generation of URLs or redirects for specific routes. You may specify a name for a route by chaining the `name` method onto the route definition:

```js
Route.get('/user/profile', handler).name('profile');
```

Once you have assigned a name to a given route, you may use the route's name when generating URLs via the `route` helper:

```js
const url = route('profile');
const urlWithParam = route('users.show', { id: 1 });
```

<a name="route-groups"></a>
## Route Groups

Route groups allow you to share route attributes across a large number of routes without needing to define those attributes on each individual route.

<a name="route-group-middleware"></a>
### Middleware

To assign middleware to all routes within a group, use the `middleware` key before defining the group:

```js
Route.group({ middleware: ['auth'] }, () => {
    Route.get('/', handler);
});
```

<a name="route-group-prefixes"></a>
### Route Prefixes

The `prefix` method may be used to prefix each route in the group with a given URI:

```js
Route.group({ prefix: 'admin' }, () => {
    Route.get('/users', handler); // Matches "/admin/users"
});
```

<a name="route-group-name-prefixes"></a>
### Route Name Prefixes

The `as` key may be used to prefix each route name in the group:

```js
Route.group({ as: 'admin.' }, () => {
    Route.get('/users', handler).name('users'); // "admin.users"
});
```

<a name="model-binding"></a>
## Model Binding

When injecting a model ID to a route, you will often query the database to retrieve the model that corresponds to that ID. Register explicit bindings through the router's `model` method in a service provider:

```js
router.model('user', User);
```

If a matching model instance is not found in the database, a 404 response is generated automatically. A route's `missing(handler)` method customizes that behavior.

<a name="fallback-routes"></a>
## Fallback Routes

Using the `Route.fallback` method, you may define a route that will be executed when no other route matches the incoming request:

```js
Route.fallback((request) => response().json({ message: 'Not found' }, 404));
```

<a name="rate-limiting"></a>
## Rate Limiting

Define rate limiters with the `RateLimiter` facade's `for` method, typically inside a service provider:

```js
RateLimiter.for('api', (request) => ({
    max: 60,
    decay: 60,
    key: request.user()?.getKey?.() || request.ip(),
    limiter: 'api',
}));
```

Attach limiters to routes using the `throttle:<limiter>` middleware. Requests exceeding the limit receive an automatic 429 response.

<a name="accessing-the-current-route"></a>
## Accessing the Current Route

You may use `currentRouteName` and `current()` on the router to access information about the route handling the incoming request.
