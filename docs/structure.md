# Directory Structure

- [Introduction](#introduction)
- [The Root Directory](#the-root-directory)
    - [The `app` Directory](#the-root-app-directory)
    - [The `bootstrap` Directory](#the-bootstrap-directory)
    - [The `config` Directory](#the-config-directory)
    - [The `database` Directory](#the-database-directory)
    - [The `docs` Directory](#the-docs-directory)
    - [The `node_modules` Directory](#the-node-modules-directory)
    - [The `public` Directory](#the-public-directory)
    - [The `resources` Directory](#the-resources-directory)
    - [The `routes` Directory](#the-routes-directory)
    - [The `storage` Directory](#the-storage-directory)
    - [The `tests` Directory](#the-tests-directory)
    - [The `vendor` Directory](#the-vendor-directory)

<a name="introduction"></a>
## Introduction

The default Nodevel application structure is intended to provide a great starting point for both large and small applications. You are free to organize your application however you like — as long as `require()` can load the file.

<a name="the-root-directory"></a>
## The Root Directory

<a name="the-root-app-directory"></a>
### The App Directory

The `app` directory contains the core code of your application. By default it contains `Http`, `Models`, and `Providers`; other directories (`Jobs`, `Events`, `Listeners`, `Notifications`, `Policies`, `Rules`, `Observers`, `Broadcasting`, `View`) are created as you run the corresponding `make:` Artisan commands.

<a name="the-bootstrap-directory"></a>
### The Bootstrap Directory

The `bootstrap` directory contains `providers.js`, which lists your service providers, and a `cache` directory holding framework-generated optimization files such as the cached configuration.

<a name="the-config-directory"></a>
### The Config Directory

The `config` directory, as the name implies, contains all of your application's configuration files: `app.js`, `database.js`, `cache.js`, `queue.js`, `session.js`, `mail.js`, and more.

<a name="the-database-directory"></a>
### The Database Directory

The `database` directory contains your database migrations, model factories, and seeders. It also holds the SQLite database by default.

<a name="the-docs-directory"></a>
### The Docs Directory

The `docs` directory contains this documentation set plus `index.html`, a browsable viewer.

<a name="the-node-modules-directory"></a>
### The Node Modules Directory

The `node_modules` directory contains your NPM dependencies.

<a name="the-public-directory"></a>
### The Public Directory

The `public` directory houses compiled assets and user-accessible files. The `storage` symlink (created by `storage:link`) links here.

<a name="the-resources-directory"></a>
### The Resources Directory

The `resources` directory contains your [Blade views](blade.md) (`resources/views`) as well as raw, uncompiled assets.

<a name="the-routes-directory"></a>
### The Routes Directory

The `routes` directory contains route definitions:

- `web.js` — web interface routes.
- `console.js` — closure-based console commands and scheduling.

<a name="the-storage-directory"></a>
### The Storage Directory

The `storage` directory contains logs, compiled Blade caches, file-based sessions, and file caches. It is segregated into `app` (application generated files), `framework` (framework caches), and `logs`.

<a name="the-tests-directory"></a>
### The Tests Directory

The `tests` directory holds automated tests in `Feature` and `Unit`. Run them with `npx tsx bin/artisan.ts test`.

<a name="the-vendor-directory"></a>
### The Vendor Directory

The `vendor` directory contains the Nodevel framework itself (`vendor/nodevel/framework`) and the Blade engine (`vendor/nodevel/blade`).
