# Localization

- [Introduction](#introduction)
- [Language Files](#language-files)
- [Using Translation Strings](#using-translation-strings)
- [Pluralization](#pluralization)

<a name="introduction"></a>
## Introduction

Nodevel's localization features let you retrieve strings in different languages. Strings live under `lang/<locale>/`.

<a name="language-files"></a>
## Language Files

Store strings in JSON files per locale:

```
lang/en/messages.json
lang/fa/messages.json
```

```json
{
    "welcome": "Welcome to our application"
}
```

The active locale comes from `APP_LOCALE` in `.env` (`en` by default).

<a name="using-translation-strings"></a>
## Using Translation Strings

Use the `__` helper from framework support:

```js
const { trans } = require('@nodevel/framework').Support;

trans('messages.welcome');        // key lookup in active locale
trans('messages.welcome', 'fa');  // explicit locale
```

In Blade views:

```blade
{{ __('messages.welcome') }}
```

Missing keys fall back to the default locale, then to the key itself.

<a name="pluralization"></a>
## Pluralization

Provide both forms separated by a pipe:

```json
{
    "apples": "There is one apple|There are many apples"
}
```

Choose based on count:

```js
transChoice('messages.apples', count);
```
