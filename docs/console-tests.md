# Console Tests

- [Introduction](#introduction)
- [Expecting Exit Codes](#expecting-exit-codes)
- [Testing Input And Output](#testing-input-and-output)

<a name="introduction"></a>
## Introduction

Nodevel lets you test Artisan commands by invoking them against a booted application.

<a name="expecting-exit-codes"></a>
## Expecting Exit Codes

```js
const { createTestApp } = require('../bootstrap');

const ctx = await createTestApp();
const artisan = ctx.app.make('artisan');

const code = await artisan.run(['migrate', '--force']);
assertEqual(code, 0);
```

Commands return their process exit code — `0` on success, non-zero on failure.

<a name="testing-input-and-output"></a>
## Testing Input And Output

Pass arguments and options as you would on the CLI:

```js
await artisan.run(['queue:work', '--once', '--stop-when-empty']);
await artisan.run(['make:model', 'Flight', '--migration']);
```

Capture output by swapping the writer, or assert observable effects instead:

```js
await artisan.run(['db:seed']);
const users = await ctx.app.make('db').table('users').count();
assertTrue(users > 0);
```
