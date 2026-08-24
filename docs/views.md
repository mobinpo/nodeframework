# Views

- [Introduction](#introduction)
- [Creating and Rendering Views](#creating-and-rendering-views)
    - [Nested View Directories](#nested-view-directories)
    - [Creating the First Available View](#creating-the-first-available-view)
    - [Determining if a View Exists](#determining-if-a-view-exists)
- [Passing Data to Views](#passing-data-to-views)
    - [Sharing Data With All Views](#sharing-data-with-all-views)
- [View Composers](#view-composers)
    - [View Creators](#view-creators)
- [Optimizing Views](#optimizing-views)

<a name="introduction"></a>
## Introduction

Views separate your controller / application logic from your presentation logic and are stored in `resources/views`. View templates are written using the [Blade templating language](blade.md):

```blade
<!-- resources/views/greeting.blade.js -->
<html>
    <body><h1>Hello, {{ $name }}</h1></body>
</html>
```

Return the view from a route or controller using the global `view` helper:

```js
Route.get('/', () => view('greeting', { name: 'James' }));
```

<a name="creating-and-rendering-views"></a>
## Creating and Rendering Views

Create a view by placing a `.blade.js` file in `resources/views`, or with Artisan:

```shell
node bin/artisan.js make:view greeting
```

The first argument to `view()` is dotted path notation relative to `resources/views`; the second is data made available to the template.

<a name="nested-view-directories"></a>
### Nested View Directories

Views may be nested in subdirectories and referenced with dot notation. A view at `resources/views/admin/profile.blade.js` renders via:

```js
return view('admin.profile', $data);
```

<a name="creating-the-first-available-view"></a>
### Creating the First Available View

Use the factory's `first` method when a view may be customized or overridden:

```js
const view = await app().make('view').first(['custom.admin', 'admin'], $data);
```

<a name="determining-if-a-view-exists"></a>
### Determining if a View Exists

```js
if (factory.exists('admin.profile')) {
    // ...
}
```

<a name="passing-data-to-views"></a>
## Passing Data to Views

Pass an object of key/value pairs; each key becomes a variable in the template. Add individual pieces of data fluently on an existing View instance:

```js
const view = await factory.make('greeting');
view.with('name', 'Victoria').with('occupation', 'Astronaut');
```

<a name="sharing-data-with-all-views"></a>
### Sharing Data With All Views

Occasionally you may need to share data with every view rendered by your application — typically inside a service provider's `boot` method:

```js
class AppServiceProvider extends ServiceProvider {
    boot() {
        this.app.make('view').share('siteName', 'My Application');
    }
}
```

<a name="view-composers"></a>
## View Composers

Composers run just before a named view renders — ideal for binding data every time a view is shown:

```js
factory.composer('profile', (view) => {
    view.with('count', 42);
});

// Multiple views, or '*' for all:
factory.composer(['profile', 'dashboard'], composerClass);
```

<a name="view-creators"></a>
### View Creators

Creators execute immediately after the view instance is created (rather than right before rendering) using the `creator` method.

<a name="optimizing-views"></a>
## Optimizing Views

Blade templates compile on demand and cache by file mtime. For production, precompile everything as part of deployment:

```shell
node bin/artisan.js view:cache
node bin/artisan.js view:clear
```
