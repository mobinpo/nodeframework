# Eloquent: Mutators & Casting

- [Introduction](#introduction)
- [Accessors And Mutators](#accessors-and-mutators)
- [Attribute Casting](#attribute-casting)
    - [JSON Casting](#json-casting)
    - [Date Casting](#date-casting)

<a name="introduction"></a>
## Introduction

Accessors transform attribute values when reading; mutators transform them when setting. Nodevel implements both through plain methods on your model.

<a name="accessors-and-mutators"></a>
## Accessors And Mutators

Define accessor / mutator pairs as async-free methods following the `get{Name}Attribute` convention:

```js
class User extends Model {
    static table = 'users';

    getFirstNameAttribute(value) {
        return value.toUpperCase();
    }

    setPasswordAttribute(value) {
        this.attributes.password = hashSync(value);
    }
}
```

Reading `user.attributes.first_name` (or serialized output) runs the accessor; assigning `user.fill({ password })` runs the mutator before persisting.

<a name="attribute-casting"></a>
## Attribute Casting

The `casts` static declares type conversions:

```js
class Post extends Model {
    static table = 'posts';

    static casts = {
        published: 'boolean',
        metadata: 'json',
        published_at: 'datetime',
    };
}
```

| Cast       | Result                          |
| ---------- | ------------------------------- |
| `boolean`  | JS boolean                      |
| `integer`  | Number                          |
| `float`    | Number                          |
| `string`   | String                          |
| `json`     | Parsed object                   |
| `datetime` | Date object                     |

<a name="json-casting"></a>
### JSON Casting

`json` casts call `JSON.parse` on access and serialize back on save.

<a name="date-casting"></a>
### Date Casting

`datetime` casts convert stored timestamps into `Date` instances on read.
