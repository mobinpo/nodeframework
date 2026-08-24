# Starter Kits

- [Introduction](#introduction)
- [Creating an Application With a Starter Kit](#creating-an-application)
- [Building Your Own Starter Kit](#building-your-own)

<a name="introduction"></a>
## Introduction

Nodevel does not ship an official starter kit yet. The framework itself already provides the backend scaffolding Laravel's starter kits generate: session authentication, Eloquent `User` model with password hashing, email verification middleware, Sanctum-style API tokens, and CSRF protection wired in `bootstrap/app.js`.

To start a project:

```shell
mkdir my-app && cd my-app
npm init -y
npm install @nodevel/framework @nodevel/blade better-sqlite3
```

Then copy the skeleton directories (`app`, `bootstrap`, `config`, `database`, `resources`, `routes`, `bin`) from any existing Nodevel application — the layout is fixed by convention.

<a name="creating-an-application"></a>
## Creating an Application With a Starter Kit

Once the skeleton is copied in place, finish setup exactly like any Nodevel app:

```shell
cp .env.example .env
npx tsx bin/artisan.ts key:generate
npx tsx bin/artisan.ts migrate
npx tsx bin/artisan.ts serve
```

<a name="building-your-own"></a>
## Building Your Own Starter Kit

A starter kit is nothing more than a repository containing a working Nodevel application. To publish one:

1. Create an application and implement your authentication UI, dashboard, and shared components (Blade components live in `resources/views/components`).
2. Remove application-specific routes from `routes/web.js`, keeping the authentication routes.
3. Publish the repository; consumers clone it, run `npm install`, and boot with `npx tsx bin/artisan.ts serve`.

Because all Nodevel conventions (paths, class names, command signatures) are deterministic, generated code needs no post-processing.
