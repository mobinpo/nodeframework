# Frontend

- [Introduction](#introduction)
- [Server Rendered Pages](#server-rendered-pages)
    - [Blade Templates](#blade-templates)
    - [Progressive Enhancement](#progressive-enhancement)
- [Single Page Applications](#single-page-applications)
    - [Serving an API](#serving-an-api)
- [Bundling Assets](#bundling-assets)

<a name="introduction"></a>
## Introduction

Nodevel is a backend framework providing everything needed to build modern web applications — [routing](routing.md), [validation](validation.md), caching, [queues](queues.md), file storage, and more. For the frontend, two primary approaches exist: server-rendered HTML via Blade, or a JavaScript SPA backed by Nodevel's API features.

<a name="server-rendered-pages"></a>
## Server Rendered Pages

<a name="blade-templates"></a>
### Blade Templates

The most common approach is rendering full HTML documents with [Blade templates](blade.md). Routes and controllers return views; forms post back to routes; each interaction returns an entirely new HTML page:

```js
Route.get('/tasks', async (request) => {
    const tasks = await app().make('db').table('tasks').get();
    return view('tasks', { tasks });
});
```

Many applications are perfectly suited to this style — it requires no build step and keeps all logic on the server.

<a name="progressive-enhancement"></a>
### Progressive Enhancement

Blade fragments pair well with libraries like htmx or Turbo. Declare fragments in your template and Nodevel returns only those fragments when the `HX-Request` header is present:

```blade
@fragment('user-list')
    <ul>@foreach ($users as $user)<li>{{ $user.name }}</li>@endforeach</ul>
@endfragment
```

This gives dynamic-feeling interfaces without writing client-side JavaScript.

<a name="single-page-applications"></a>
## Single Page Applications

<a name="serving-an-api"></a>
### Serving an API

Pair React, Vue, or Svelte with a Nodevel API backend. Return JSON from controllers and authenticate with [Sanctum](sanctum.md):

```js
Route.get('/api/posts', async () => {
    return Post.query().latest().limit(20).get();
});
```

Stateless API routes skip session handling; cookie-based SPA authentication shares the top-level domain between frontend and API.

<a name="bundling-assets"></a>
## Bundling Assets

Place raw assets in `resources/` (or `public/` for static files). For build-step workflows, any bundler works — Vite, esbuild, webpack — configured to output into `public/build`. Reference compiled files with the `asset()` helper:

```blade
<script src="{{ asset('build/app.js') }}"></script>
```
