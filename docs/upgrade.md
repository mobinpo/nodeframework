# Upgrade Guide

- [Upgrading To Nodevel 1.0 From Laravel](#upgrading-from-laravel)
- [Dependency Updates](#dependency-updates)

<a name="upgrading-from-laravel"></a>
## Upgrading To Nodevel 1.0 From Laravel

Nodevel mirrors Laravel 13 conventions, so most application code ports mechanically:

| Laravel | Nodevel |
| --- | --- |
| `php artisan ...` | `node bin/artisan.js ...` (or `npm run artisan -- ...`) |
| `composer require pkg` | `npm install pkg` |
| `bootstrap/app.php` | `bootstrap/app.js` (same `withMiddleware`, alias style) |
| `routes/web.php` / `routes/console.php` | `routes/web.js` / `routes/console.js` |
| `config/*.php` returning arrays | `config/*.js` exporting `(env) => ({...})` |
| `.blade.php` templates | `.blade.js` templates (`{{ }}`, directives identical; expressions are JavaScript) |
| PHP type hints in controllers | JSDoc or runtime validation via `Validator` |

Behavioral notes:

- **Async everywhere.** Eloquent calls return promises: `await User.find(1)`. Route actions may be `async`.
- **Constructor injection** uses `static inject = ['logger']` instead of PHP reflection.
- **Casts** use rule names as strings (`'json'`, `'integer'`) — the same names as Laravel.

<a name="dependency-updates"></a>
## Dependency Updates

After pulling a framework update, refresh dependencies and re-run optimization:

```shell
npm install
node bin/artisan.js optimize
```
