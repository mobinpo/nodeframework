# Mix (Legacy Asset Compilation)

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Compiling Assets With Vite](#compiling-assets)

<a name="introduction"></a>
## Introduction

Laravel Mix was the historical asset compilation layer (Webpack-based), superseded by Vite in Laravel 9.x.

<a name="nodevel-status"></a>
## Nodevel Status

Not implemented — Nodevel never had a Mix era. The supported asset pipeline is [Vite](/framework/docs/vite): reference entry points in Blade with `@vite`-style tags and run `npm install && npm run build` before deploying.

Plain static assets work with zero tooling: drop files into `public/` and reference them through the `asset()` helper:

```blade
<link rel="stylesheet" href="{{ asset('css/app.css') }}">
<script src="{{ asset('js/app.js') }}" defer></script>
```

The `public/storage` symlink created by `npx tsx bin/artisan.ts storage:link` exposes stored files under the same public root.
