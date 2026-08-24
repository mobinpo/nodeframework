# Vite

- [Introduction](#introduction)
- [Installation And Setup](#installation-and-setup)
- [Loading Your Scripts And Styles](#loading-your-scripts-and-styles)

<a name="introduction"></a>
## Introduction

Vite is a modern frontend build tool that provides an extremely fast development environment and bundles your code for production. Nodevel integrates with Vite exactly like any Node project — no special glue required.

<a name="installation-and-setup"></a>
## Installation And Setup

```shell
npm install --save-dev vite
```

Add scripts to `package.json`:

```json
{
    "scripts": {
        "dev": "vite",
        "build": "vite build"
    }
}
```

A minimal `vite.config.js`:

```js
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        outDir: 'public/build',
        rollupOptions: {
            input: 'resources/js/app.js',
        },
    },
});
```

During development run both servers:

```shell
node bin/server.js &
npm run dev
```

For production:

```shell
npm run build
```

<a name="loading-your-scripts-and-styles"></a>
## Loading Your Scripts And Styles

In Blade layouts, reference the built entrypoints directly:

```blade
<link rel="stylesheet" href="/build/assets/app.css">
<script type="module" src="/build/assets/app.js"></script>
```

Serve `public/` statically so built assets resolve; the dev server proxies your API calls back to Nodevel.
