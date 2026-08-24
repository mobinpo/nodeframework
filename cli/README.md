# @nodevel/cli

The official installer for [Nodevel](https://github.com/mobinpo/nodeframework) — the Laravel-inspired web application framework for Node.js.

## Installation

```shell
npm install -g @nodevel/cli
```

## Usage

Create a new Nodevel application — just like `laravel new`:

```shell
nodevel new project-name
cd project-name
npm run dev          # http://localhost:8000
```

The installer copies the application skeleton, generates your `APP_KEY`, initializes a git repository, and installs all dependencies.

### Options

```
nodevel new <project-name> [options]

  --force            Overwrite the target directory if it exists
  --skip-install     Skip installing npm dependencies
  -h, --help         Display help
  -V, --version      Display the CLI version
```

## What's Inside a New Application?

- **Artisan console** (`npm run artisan`) — serve, migrate, test, generators, and more
- **Eloquent ORM** with SQLite by default (MySQL/PostgreSQL supported)
- **Blade templating** with layouts and components
- **Routing** in `routes/web.ts` with sessions and CSRF protection
- A ready-to-run test suite (`npm test`)

## License

[MIT](https://github.com/mobinpo/nodeframework/blob/main/LICENSE)
