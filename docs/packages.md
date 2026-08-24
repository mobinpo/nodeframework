# Package Development

- [Introduction](#introduction)
- [Service Providers](#service-providers)
- [Registering Providers](#registering-providers)
- [Resources](#resources)

<a name="introduction"></a>
## Introduction

Packages add functionality to Nodevel. A package is a plain npm module that ships a service provider — the framework does the rest.

<a name="service-providers"></a>
## Service Providers

A provider has `register` and `boot` methods:

```js
'use strict';

class MyPackageServiceProvider {
    constructor(app) {
        this.app = app;
    }

    register() {
        this.app.singleton('my-package', () => new MyPackageService());
    }

    boot() {
        // Routes, views, commands...
    }
}

module.exports = { default: MyPackageServiceProvider };
```

`register` runs first for all providers; `boot` runs after every provider is registered, so you may depend on any other service.

<a name="registering-providers"></a>
## Registering Providers

Add the package to `package.json`, then list its provider in `bootstrap/providers.js`:

```js
module.exports = [
    require('./app/Providers/AppServiceProvider'),
    require('my-nodevel-package').default,
];
```

The framework boots listed providers on startup and in tests.

<a name="resources"></a>
## Resources

Publishable stubs (config files, migrations) are copied by the package's install command into the application's normal directories — `config/`, `database/migrations/` — so they behave exactly like first-party files.
