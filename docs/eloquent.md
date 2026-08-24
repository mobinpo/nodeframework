# Eloquent: Getting Started

- [Introduction](#introduction)
- [Generating Model Classes](#generating-model-classes)
- [Eloquent Model Conventions](#eloquent-model-conventions)
    - [Table Names](#table-names)
    - [Primary Keys](#primary-keys)
    - [Timestamps](#timestamps)
    - [Database Connections](#database-connections)
- [Retrieving Models](#retrieving-models)
- [Retrieving Single Models / Aggregates](#retrieving-single-models)
- [Inserting and Updating Models](#inserting-and-updating-models)
    - [Inserts](#inserts)
    - [Updates](#updates)
    - [Mass Assignment](#mass-assignment)
- [Deleting Models](#deleting-models)
    - [Soft Deleting](#soft-deleting)
- [Query Scopes](#query-scopes)
- [Events](#events)

<a name="introduction"></a>
## Introduction

Nodevel includes Eloquent, an object-relational mapper (ORM) that makes it enjoyable to interact with your database. When using Eloquent, each database table has a corresponding "Model" that is used to interact with that table. In addition to retrieving records from the database table, Eloquent models allow you to insert, update, and delete records from the table as well.

<a name="generating-model-classes"></a>
## Generating Model Classes

To get started, create an Eloquent model. Models live in the `app/Models` directory and extend the framework's `Model` class. Use the `make:model` Artisan command:

```shell
node bin/artisan.js make:model Flight
node bin/artisan.js make:model Flight --migration   # also create a migration (-m)
node bin/artisan.js make:model Flight --factory     # also a factory (-f)
node bin/artisan.js make:model Flight --seed        # also a seeder (-s)
node bin/artisan.js make:model Flight --controller  # also a controller (-c)
node bin/artisan.js make:model Flight --all         # all of the above (-a)
```

<a name="eloquent-model-conventions"></a>
## Eloquent Model Conventions

```js
const Model = require('@nodevel/framework').Database.Model;

class Flight extends Model {
    static table = 'flights';
    static fillable = ['name', 'airline'];
}
module.exports = { default: Flight, Flight };
```

<a name="table-names"></a>
### Table Names

By convention, the "snake case", plural name of the class will be used as the table name unless another name is explicitly specified via `static table`. The `Flight` model stores records in the `flights` table.

<a name="primary-keys"></a>
### Primary Keys

Eloquent assumes each model's table has a primary key column named `id`. Override it with `static primaryKey`. If your key is not auto-incrementing, set `static incrementing = false` and `static keyType = 'string'`.

<a name="timestamps"></a>
### Timestamps

By default, Eloquent expects `created_at` and `updated_at` columns to exist on the table and manages them automatically. Set `static timestamps = false` to disable.

<a name="database-connections"></a>
### Database Connections

All models use the default connection. Specify another with `static connection = 'mysql'`.

<a name="retrieving-models"></a>
## Retrieving Models

```js
const flights = await Flight.all();
for (const flight of flights) console.log(flight.name);

// Constraining with the query builder:
const active = await Flight.query().where('active', 1).orderBy('name').limit(10).get();
```

<a name="retrieving-single-models"></a>
## Retrieving Single Models / Aggregates

```js
const flight = await Flight.find(1);            // by primary key or null
await Flight.findOrFail(1);                     // throws ModelNotFoundError (404)
const first = await Flight.query().where('active', 1).first();

// Aggregates
const count = await Flight.query().count();
const max = await Flight.query().max('price');
```

<a name="inserting-and-updating-models"></a>
## Inserting and Updating Models

<a name="inserts"></a>
### Inserts

```js
const flight = new Flight({});
flight.name = 'London to Paris';
await flight.save();

// Or in one statement:
const flight = await Flight.create({ name: 'London to Paris' });
```

The model's `created_at` and `updated_at` timestamps are managed automatically.

<a name="updates"></a>
### Updates

```js
const flight = await Flight.find(1);
flight.name = 'Paris to London';
await flight.save();

// Mass update across a query (no events dispatched):
await Flight.query().where('active', 1).update({ delayed: 1 });
```

Examine attribute changes with `isDirty()`, `isClean()`, `wasChanged()` and `getOriginal()`.

<a name="mass-assignment"></a>
### Mass Assignment

Define `static fillable` on the model to declare which attributes may be mass-assigned via `create` and `fill`. This protects against mass assignment vulnerabilities — a malicious user sending unexpected request fields cannot change columns you did not intend.

<a name="deleting-models"></a>
## Deleting Models

```js
const flight = await Flight.find(1);
await flight.delete();          // instance delete (fires events)
Flight.destroy(1);              // delete by primary keys
await Flight.query().where('active', 0).delete(); // mass delete (no events)
```

<a name="soft-deleting"></a>
### Soft Deleting

Set `static softDeletes = true` on the model (the table needs a nullable `deleted_at` column). Soft deleted models are excluded from query results automatically:

```js
await post.delete();                       // sets deleted_at
post.trashed();                            // true
await Post.withTrashed().get();            // include trashed rows
await Post.onlyTrashed().get();            // only trashed rows
await post.restore();                      // undelete
```

<a name="query-scopes"></a>
## Query Scopes

Register global scopes that apply to every query for a model:

```js
class User extends Model {
    static globalScopes = [
        (builder) => builder.where('active', 1),
    ];
}
```

<a name="events"></a>
## Events

Models dispatch lifecycle events. Listen per model with `listen` or register an observer class:

```js
User.listen('created', (user) => { /* ... */ });

// app/Observers/UserObserver.js — created(), updated(), deleted(), ...
User.observe(new UserObserver());
```
