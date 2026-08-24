# Database: Query Builder

- [Introduction](#introduction)
- [Running Queries](#running-queries)
    - [Retrieving All Rows](#retrieving-all-rows)
    - [Retrieving a Single Row](#retrieving-a-single-row)
    - [Aggregates](#aggregates)
- [Where Clauses](#where-clauses)
- [Ordering, Grouping, Limit and Offset](#ordering-grouping-limit-offset)
- [Inserts](#inserts)
- [Updates](#updates)
- [Deletes](#deletes)

<a name="introduction"></a>
## Introduction

The database query builder provides a convenient, fluent interface for creating and running database queries. It sits under Eloquent but is usable directly:

```js
const db = app().make('db');
const users = await db.table('users').get();
```

Parameter binding protects against SQL injection automatically — never concatenate user input into SQL.

<a name="running-queries"></a>
## Running Queries

<a name="retrieving-all-rows"></a>
### Retrieving All Rows

```js
const rows = await db.table('users').get();
for (const row of rows) console.log(row.name);
```

Select specific columns with `select('id', 'name')`; join tables with `join(table, first, operator, second)` and `leftJoin`.

<a name="retrieving-a-single-row"></a>
### Retrieving a Single Row

```js
const user = await db.table('users').where('name', 'John').first();
const id = await db.table('users').where('email', 'x@y.z').value('id');
const exists = await db.table('orders').where('paid', 1).exists();
```

`find(id)` / `findOrFail(id)` query by primary key.

<a name="aggregates"></a>
### Aggregates

```js
await table.count();
await table.max('price');
await table.min('price');
await table.sum('quantity');
await table.avg('rating');
```

<a name="where-clauses"></a>
## Where Clauses

```js
.where('votes', '>=', 100)      // operator form
.where('status', 'active')      // defaults to =
.orWhere('status', 'banned')
.whereIn('id', [1, 2, 3])
.whereNotIn('id', [4])
.whereNull('deleted_at')
.whereNotNull('updated_at')
.whereBetween('votes', [1, 100])
.whereColumn('first_name', '=', 'last_name')

// Logical grouping:
.where((query) => {
    query.where('a', 1).orWhere('b', 2);
})
```

<a name="ordering-grouping-limit-offset"></a>
## Ordering, Grouping, Limit and Offset

```js
.orderBy('name')
.orderByDesc('created_at')
.groupBy('account_id').having('count(*) > ?', [1])
.limit(10).offset(20)
```

<a name="inserts"></a>
## Inserts

```js
await db.table('users').insert({ name: 'Taylor', email: 'taylor@example.com' });

// Multiple rows:
await db.table('users').insert([
    { name: 'A' }, { name: 'B' },
]);

const id = await db.table('users').insertGetId({ name: 'C' }, 'id');
```

<a name="updates"></a>
## Updates

```js
await db.table('users').where('active', 0).update({ active: 1 });
await db.table('users').increment('views');
await db.table('users').decrement('credits', 5);
await db.table('users').updateOrInsert({ email: e }, { name: n });
```

<a name="deletes"></a>
## Deletes

```js
await db.table('users').delete();
await db.table('users').where('active', 0).delete();
await db.table('users').truncate();
```

Large sets iterate safely with keyset pagination via `chunkById(size, callback)` — safe even while updating the iterated rows.
