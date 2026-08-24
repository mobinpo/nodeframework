# Strings

- [Introduction](#introduction)
- [Available Methods](#available-methods)

<a name="introduction"></a>
## Introduction

`Str` provides fluent string helpers — the port of `Illuminate\Support\Str`.

```js
const Str = require('@nodevel/framework/src/Support/Str');
```

<a name="available-methods"></a>
## Available Methods

#### `Str.pascal()`

Convert to PascalCase:

```js
Str.pascal('user_profile'); // UserProfile
```

#### `Str.snake()`

Convert to snake_case:

```js
Str.snake('UserProfile'); // user_profile
```

#### `Str.plural()`

Pluralize an English word:

```js
Str.plural('category'); // categories
```

#### `Str.camel()`

camelCase conversion.

#### `Str.kebab()`

kebab-case conversion for URLs and CSS.

#### `Str.limit()`

Truncate at N characters:

```js
Str.limit('The quick brown fox', 9); // The quick...
```

#### `Str.random()`

Random alphanumeric string:

```js
Str.random(16);
```

#### `Str.uuid()`

Generate a UUID.

#### `Str.slug()`

URL-safe slug:

```js
Str.slug('Laravel 5 Framework', '-'); // laravel-5-framework
```

#### `Str.startsWith()` / `Str.endsWith()`

Prefix and suffix checks.

#### `Str.contains()`

Whether a haystack contains a needle.

#### `Str.studly()`

StudlyCase (PascalCase) conversion.

#### `Str.title()`

Title Case each word.
