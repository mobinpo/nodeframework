# Database Testing

- [Introduction](#introduction)
- [Resetting The Database After Each Test](#resetting-the-database-after-each-test)
- [Model Factories](#model-factories)

<a name="introduction"></a>
## Introduction

Nodevel includes helpers for asserting against your database during feature tests.

```js
// Assert the application stored a record...
const user = await app.make('db').table('users').where('email', 'test@example.com').first();
assert(user);
```

<a name="resetting-the-database-after-each-test"></a>
## Resetting The Database After Each Test

The test harness boots against an in-memory SQLite database (`DB_DATABASE=:memory:`), so every test process starts from a clean schema — migrations run once at boot and nothing persists between processes.

To reset mid-suite, re-run your migrations directly:

```js
const SchemaBuilder = require('@nodevel/framework/src/Database/Schema/Builder');
const builder = new SchemaBuilder(app.make('db').connection());
await builder.dropAllTables();
```

<a name="model-factories"></a>
## Model Factories

Seed test data with factories:

```shell
node artisan make:factory PostFactory --model=Post
```

```js
const factory = require('../database/factories/PostFactory');

const post = await factory.create({ title: 'Test post' });
```

See the [seeding documentation](/docs/seeding) for full details.
