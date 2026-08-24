# Eloquent Resources

- [Introduction](#introduction)
- [Generating Resources](#generating-resources)
- [Transforming Resources](#transforming-resources)

<a name="introduction"></a>
## Introduction

Resources let you transform Eloquent models into JSON responses with explicit control over every field — an API layer between models and output.

<a name="generating-resources"></a>
## Generating Resources

Create the file manually in `app/Http/Resources`:

```js
'use strict';

class UserResource {
    constructor(user) {
        this.user = user;
    }

    toArray() {
        return {
            id: this.user.getKey(),
            name: this.user.attributes.name,
            email: this.user.attributes.email,
            createdAt: this.user.attributes.created_at,
        };
    }

    toJson() {
        return JSON.stringify(this.toArray());
    }
}

module.exports = { default: UserResource, UserResource };
```

<a name="transforming-resources"></a>
## Transforming Resources

Wrap a model or collection:

```js
const { UserResource } = require('../Http/Resources/UserResource');

Route.get('/users/{id}', async (request, id) => {
    const user = await User.find(id);
    return response().json(new UserResource(user).toArray());
});
```

Collections map naturally:

```js
const users = await User.all();
return response().json(users.map((u) => new UserResource(u).toArray()));
```

Remember that `hiddenFields` on a model also hides attributes from serialization — resources are the explicit alternative when you need per-endpoint control.
