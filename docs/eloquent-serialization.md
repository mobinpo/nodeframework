# Eloquent: Serialization

- [Introduction](#introduction)
- [Serializing Models And Collections](#serializing-models-and-collections)
- [Hiding Attributes From JSON](#hiding-attributes-from-json)

<a name="introduction"></a>
## Introduction

When building APIs you often convert models and collections to strings or arrays. Nodevel serializes recursively, so nested relations come along.

<a name="serializing-models-and-collections"></a>
## Serializing Models And Collections

```js
const user = await User.find(1);

user.toJson();          // JSON string
user.toArray();         // plain object
JSON.stringify(user);   // implicit toJson()
```

Collections serialize the same way:

```js
const users = await User.all();
users.toJson();
```

<a name="hiding-attributes-from-json"></a>
## Hiding Attributes From JSON

Some attributes (passwords, tokens) should never appear in serialized output. Declare them once:

```js
class User extends Model {
    static hiddenFields = ['password', 'remember_token'];
}
```

Hidden fields are stripped from arrays, JSON, and `JSON.stringify`.
