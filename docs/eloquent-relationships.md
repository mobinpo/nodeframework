# Eloquent: Relationships

- [Introduction](#introduction)
- [Defining Relationships](#defining-relationships)
    - [One to One](#one-to-one)
    - [One to Many](#one-to-many)
    - [Many to Many](#many-to-many)
- [Eager Loading](#eager-loading)

<a name="introduction"></a>
## Introduction

Database tables are often related. Eloquent makes managing and working with these relationships easy through relationship methods on model classes.

<a name="defining-relationships"></a>
## Defining Relationships

Relationships are methods returning relation objects; call them like properties after loading (`post.user`) or query them directly.

<a name="one-to-one"></a>
### One to One

```js
class User extends Model {
    phone() {
        return this.hasOne(Phone);
    }
}

// Usage:
const phone = await user.phone();          // query
const loaded = user.relations.phone;       // cached result
```

The `Phone` model gets a matching `belongsTo`:

```js
class Phone extends Model {
    user() {
        return this.belongsTo(User);
    }
}
```

Foreign key conventions mirror Laravel: `{snake_model}_id` on the related table, overridable via the second argument.

<a name="one-to-many"></a>
### One to Many

```js
class Post extends Model {
    comments() {
        return this.hasMany(Comment);
    }
}
```

```js
const comments = await post.comments();

// Add a related child:
const comment = new Comment({});
comment.fill({ body: 'Nice!' });
comment.post_id = post.id;
await comment.save();
```

<a name="many-to-many"></a>
### Many to Many

Pivot tables join two models; by convention the pivot is named from both tables alphabetically:

```js
class User extends Model {
    roles() {
        return this.belongsToMany(Role); // pivot: role_user
    }
}
```

Attach, detach, or sync pivot rows:

```js
const roles = await user.roles();
await roles.attach(roleId);
await roles.detach(roleId);
await roles.sync([1, 2, 3]);   // { attached, detached }
```

<a name="eager-loading"></a>
## Eager Loading

Solve the N+1 query problem by loading relationships in a single query:

```js
// Lazy loads per model (N queries):
for (const book of await Book.all()) { /* book.loadRelation('author') */ }

// Eager load (2 queries total):
const books = await Book.query().with('author').get();

books.items[0].relations.author;
```
