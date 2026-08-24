# Seeding

- [Introduction](#introduction)
- [Writing Seeders](#writing-seeders)
    - [Generating Seeders](#generating-seeders)
- [Running Seeders](#running-seeders)

<a name="introduction"></a>
## Introduction

Seeders insert default or sample data into your database. Every seeder extends the base seeder contract and lives in `database/seeders`.

<a name="writing-seeders"></a>
## Writing Seeders

<a name="generating-seeders"></a>
### Generating Seeders

```shell
node artisan make:seeder UserSeeder
```

```js
'use strict';

class UserSeeder {
    constructor(app) {
        this.app = app;
    }

    async run() {
        const { User } = require('../../app/Models/User');
        await User.create({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password',
        });
    }
}

module.exports = { default: UserSeeder, UserSeeder };
```

The root `DatabaseSeeder` calls every other seeder:

```js
async run() {
    await new UserSeeder(this.app).run();
}
```

Pair with [factories](/docs/eloquent-factories) for volume:

```js
for (let i = 0; i < 50; i++) {
    await postFactory.create({ title: `Post ${i}` });
}
```

<a name="running-seeders"></a>
## Running Seeders

```shell
node artisan db:seed
```

Fresh database plus seed in one step:

```shell
node artisan migrate:fresh --seed
```
