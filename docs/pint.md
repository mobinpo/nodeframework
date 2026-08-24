# Pint Code Style Fixer

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Keeping Nodevel Code Styled](#keeping-code-styled)

<a name="introduction"></a>
## Introduction

Laravel Pint is an opinionated PHP code-style fixer built on PHP-CS-Fixer.

<a name="nodevel-status"></a>
## Nodevel Status

Not bundled. The Nodevel codebase itself follows the style you see in `vendor/nodevel`: 4-space indentation, single quotes, trailing commas in multiline structures, `'use strict';` headers, and JSDoc comments on public classes.

<a name="keeping-code-styled"></a>
## Keeping Nodevel Code Styled

Wire any JavaScript formatter to your project — Prettier is the closest equivalent:

```shell
npm install --save-dev prettier
npx prettier --write app routes tests
```

A minimal `.prettierrc` matching Nodevel conventions:

```json
{
    "singleQuote": true,
    "tabWidth": 4,
    "trailingComma": "es5"
}
```

The framework ships with ESLint-disable pragmas where dynamic behavior is intentional, so standard lint rules run cleanly over first-party code.
