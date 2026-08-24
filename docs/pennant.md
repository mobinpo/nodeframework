# Pennant Feature Flags

- [Introduction](#introduction)
- [Defining Features](#defining-features)
- [Checking Features](#checking-features)

<a name="introduction"></a>
## Introduction

Laravel Pennant provides a lightweight feature-flag API. Nodevel does not bundle Pennant, but the same pattern is a few lines with the cache layer as the store.

<a name="defining-features"></a>
## Defining Features

```js
// app/Features/Features.js
const features = {
    'new-dashboard': (scope) => scope.attributes.email.endsWith('@example.com'),
    'beta-search': () => false,
};

module.exports = { features };
```

<a name="checking-features"></a>
## Checking Features

```js
// app/Providers/AppServiceProvider.js — boot()
const { features } = require('../app/Features/Features');

this.app.singleton('features', () => ({
    active: async (name, scope) => {
        const cached = await this.app.make('cache').remember(
            `feature:${name}:${scope.getKey()}`, 300,
            () => Boolean(features[name]?.(scope))
        );
        return cached;
    },
}));
```

In Blade views or controllers:

```blade
@if (await app().make('features').active('new-dashboard', auth().user()))
    <a href="/dashboard-v2">Try the new dashboard</a>
@endif
```

The cache-backed resolution keeps flag checks off the database hot path and honors TTL-based re-evaluation, mirroring Pennant's `Feature::active()` ergonomics.
