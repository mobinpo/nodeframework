# Eloquent: Factories

- [Introduction](#introduction)
- [Defining Model Factories](#defining-model-factories)
    - [Generating Factories](#generating-factories)
- [Creating Models Using Factories](#creating-models-using-factories)

<a name="introduction"></a>
## Introduction

Factories let you define reusable blueprints for Eloquent models — perfect for testing and seeding.

<a name="defining-model-factories"></a>
## Defining Model Factories

<a name="generating-factories"></a>
### Generating Factories

```shell
node artisan make:factory PostFactory --model=Post
```

Factories live in `database/factories`:

```js
'use strict';

/**
 * Factory definitions for the Post model.
 */
const factory = {
    model: require('../../app/Models/Post'),

    definition() {
        return {
            title: 'Example post',
            body: 'Post body text.',
            published: 1,
        };
    },
};

factory.create = async function create(attributes = {}) {
    const record = { ...this.definition(), ...attributes };
    const instance = new this.model({});
    instance.fill(record);
    await instance.save();
    return instance;
};

module.exports = factory;
```

<a name="creating-models-using-factories"></a>
## Creating Models Using Factories

Persist one or many models:

```js
const factory = require('../database/factories/PostFactory');

const post = await factory.create();

// Many at once...
const posts = [];
for (let i = 0; i < 5; i++) {
    posts.push(await factory.create({ title: `Post ${i}` }));
}
```

Attributes passed to `create` override the defaults.
