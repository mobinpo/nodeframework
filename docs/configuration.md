# Configuration

- [Introduction](#introduction)
- [Environment Configuration](#environment-configuration)
    - [Environment Variable Types](#environment-variable-types)
    - [Retrieving Environment Configuration](#retrieving-environment-configuration)
    - [Determining the Current Environment](#determining-the-current-environment)
    - [Encrypting Environment Files](#encrypting-environment-files)
- [Accessing Configuration Values](#accessing-configuration-values)
- [Configuration Caching](#configuration-caching)
- [Debug Mode](#debug-mode)
- [Maintenance Mode](#maintenance-mode)

<a name="introduction"></a>
## Introduction

All of the configuration files for the Nodevel framework are stored in the `config` directory. Each option is documented, so feel free to look through the files and get familiar with the options available to you.

The `about` Artisan command displays an overview of your application's configuration, drivers, and environment:

```shell
node bin/artisan.js about
node bin/artisan.js about --only=environment
```

Or explore a specific configuration file's values in detail:

```shell
node bin/artisan.js config:show database
```

<a name="environment-configuration"></a>
## Environment Configuration

It is often helpful to have different configuration values based on the environment where the application is running. Nodevel loads a `.env` file from the root directory; `.env.example` documents every common variable.

Any variable in your `.env` file can be overridden by external environment variables such as server-level or system-level variables.

Your `.env` file should not be committed to source control, since sensitive credentials would be exposed. However, you may encrypt it safely with `env:encrypt`.

<a name="environment-variable-types"></a>
### Environment Variable Types

Reserved values are cast to native types:

| `.env` Value | Parsed Value |
| ------------ | ------------ |
| `true`       | (bool) true  |
| `(true)`     | (bool) true  |
| `false`      | (bool) false |
| `null`       | (null) null  |
| `empty`      | (string) ''  |

Values containing spaces should be enclosed in double quotes:

```ini
APP_NAME="My Application"
```

Double-quoted values support `${VAR}` interpolation of previously defined variables.

<a name="retrieving-environment-configuration"></a>
### Retrieving Environment Configuration

Configuration files receive an `env` function and read values through it:

```js
// config/app.js
module.exports = (env) => ({
    debug: Boolean(env('APP_DEBUG', false)),
});
```

The second argument is the default, returned when no variable exists.

> **Important:** once configuration is cached (see below), only call `env()` from within your `config/` files; elsewhere use the `config()` helper.

<a name="determining-the-current-environment"></a>
### Determining the Current Environment

```js
app().environment();          // e.g. 'local'
app().isProduction();
app().isLocal();
```

The current environment is determined by the `APP_ENV` variable.

<a name="encrypting-environment-files"></a>
### Encrypting Environment Files

Unencrypted `.env` files should never be stored in source control, but encrypted copies may be committed safely:

```shell
node bin/artisan.js env:encrypt
node bin/artisan.js env:encrypt --readable     # keep variable names visible

node bin/artisan.js env:decrypt --key=YOUR_KEY --force
```

Store the encryption key in a secure password manager — it is required to decrypt.

<a name="accessing-configuration-values"></a>
## Accessing Configuration Values

Use "dot" syntax including the file name and option:

```js
config('app.timezone', 'UTC');   // helper with default
Config.get('database.default');
```

Set at runtime:

```js
Config.set('app.timezone', 'America/Chicago');
```

Typed getters (`string`, `integer`, `float`, `boolean`, `array`) throw when the stored value does not match the expected type.

<a name="configuration-caching"></a>
## Configuration Caching

To give your application a speed boost, cache all configuration into a single file:

```shell
node bin/artisan.js config:cache
node bin/artisan.js config:clear
```

Run this as part of production deployment — never during local development, where options change frequently.

<a name="debug-mode"></a>
## Debug Mode

The `debug` option in `config/app.js` determines how much error information is displayed. **In production this value must always be `false`; otherwise you risk exposing sensitive configuration to end users.**

<a name="maintenance-mode"></a>
## Maintenance Mode

Put the app in maintenance mode with `down` and restore it with `up`:

```shell
node bin/artisan.js down --refresh=15          # auto-refresh header
node bin/artisan.js down --secret=1630542a     # bypass URL /1630542a...
node bin/artisan.js up
```

While down, all requests receive a 503 response.
