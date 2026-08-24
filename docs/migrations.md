# Database: Migrations

- [Introduction](#introduction)
- [Generating Migrations](#generating-migrations)
- [Migration Structure](#migration-structure)
- [Running Migrations](#running-migrations)
    - [Rolling Back Migrations](#rolling-back-migrations)
- [Tables](#tables)
    - [Creating Tables](#creating-tables)
    - [Updating Tables](#updating-tables)
    - [Renaming / Dropping Tables](#renaming-and-dropping-tables)
- [Columns](#columns)
    - [Creating Columns](#creating-columns)
    - [Available Column Types](#available-column-types)
    - [Column Modifiers](#column-modifiers)
- [Indexes](#indexes)
- [Foreign Key Constraints](#foreign-key-constraints)

<a name="introduction"></a>
## Introduction

Migrations are like version control for your database, allowing your team to define and share the application's database schema definition. The `Schema` builder provides database agnostic support for creating and manipulating tables across all of Nodevel's supported database systems (SQLite, MySQL / MariaDB, PostgreSQL).

<a name="generating-migrations"></a>
## Generating Migrations

Use the `make:migration` Artisan command. The new migration is placed in `database/migrations`; each filename contains a timestamp that determines execution order:

```shell
npx tsx bin/artisan.ts make:migration create_flights_table
npx tsx bin/artisan.ts make:migration create_flights_table --create=flights
npx tsx bin/artisan.ts make:migration add_votes_to_users_table --table=users
```

<a name="migration-structure"></a>
## Migration Structure

A migration exports two methods: `up(schema, connection)` adds new tables, columns or indexes; `down` reverses the operations of `up`:

```js
'use strict';

module.exports = {
    async up(schema) {
        await schema.create('flights', (table) => {
            table.id();
            table.string('name');
            table.string('airline');
            table.timestamps();
        });
    },

    async down(schema) {
        await schema.dropIfExists('flights');
    },
};
```

<a name="running-migrations"></a>
## Running Migrations

To run all of your outstanding migrations, execute the `migrate` Artisan command:

```shell
npx tsx bin/artisan.ts migrate
npx tsx bin/artisan.ts migrate --force      # run without confirmation in production
npx tsx bin/artisan.ts migrate --pretend    # print SQL without running
```

To see which migrations have run and which are pending:

```shell
npx tsx bin/artisan.ts migrate:status
```

<a name="rolling-back-migrations"></a>
### Rolling Back Migrations

```shell
npx tsx bin/artisan.ts migrate:rollback          # roll back the last batch
npx tsx bin/artisan.ts migrate:rollback --step=5 # last five migrations
npx tsx bin/artisan.ts migrate:rollback --batch=3
npx tsx bin/artisan.ts migrate:reset             # roll back everything

npx tsx bin/artisan.ts migrate:refresh           # reset + re-migrate
npx tsx bin/artisan.ts migrate:fresh             # drop all tables + re-migrate
npx tsx bin/artisan.ts migrate:fresh --seed      # ...then seed
```

<a name="tables"></a>
## Tables

<a name="creating-tables"></a>
### Creating Tables

Use the `create` method on the schema builder passed to your migration:

```js
await schema.create('users', (table) => {
    table.id();
    table.string('name');
    table.string('email');
    table.timestamps();
});
```

Existence checks: `schema.hasTable('users')`, and per-column checks via the connection.

<a name="updating-tables"></a>
### Updating Tables

The `table` method updates existing tables:

```js
await schema.table('users', (table) => {
    table.integer('votes');
});
```

<a name="renaming-and-dropping-tables"></a>
### Renaming / Dropping Tables

```js
await schema.rename($from, $to);
await schema.drop('users');
await schema.dropIfExists('users');
```

<a name="columns"></a>
## Columns

<a name="available-column-types"></a>
### Available Column Types

| Command                        | Description                                        |
| ------------------------------ | -------------------------------------------------- |
| `table.id()`                   | Auto-incrementing BIGINT primary key (`id`).       |
| `table.increments(name)`       | Auto-incrementing INT primary key.                 |
| `table.bigInteger(name)`       | BIGINT column.                                     |
| `table.integer(name)`          | INTEGER column.                                    |
| `table.smallInteger(name)`     | SMALLINT column.                                   |
| `table.tinyInteger(name)`      | TINYINT (SMALLINT on pg/sqlite).                   |
| `table.string(name, length)`   | VARCHAR(255) by default.                           |
| `table.char(name, length)`     | CHAR column.                                       |
| `table.text(name)`             | TEXT column (all text sizes map to TEXT).           |
| `table.boolean(name)`          | BOOLEAN (INTEGER on sqlite).                       |
| `table.date(name)`             | DATE column.                                       |
| `table.dateTime(name)`         | DATETIME / TIMESTAMP(0).                           |
| `table.timestamp(name)`        | TIMESTAMP column.                                  |
| `table.timestamps()`           | Adds nullable `created_at` / `updated_at`.          |
| `table.softDeletes()`          | Adds nullable `deleted_at`.                         |
| `table.json(name)`             | JSONB on PostgreSQL, TEXT elsewhere.                |
| `table.uuid(name)`             | UUID on PostgreSQL, CHAR(36) elsewhere.             |
| `table.ulid(name)`             | CHAR(26) ULID column.                               |
| `table.foreignId(name)`        | Unsigned BIGINT key column.                         |
| `table.morphs(name)`           | `{name}_type` string + `{name}_id` bigint index.    |
| `table.enum(name, values)`     | ENUM on MySQL, VARCHAR elsewhere.                   |
| `table.binary(name)`           | BLOB / BYTEA column.                                |
| `table.ipAddress(name)`        | VARCHAR(45) IP address.                             |
| `table.macAddress(name)`       | VARCHAR(17) MAC address.                            |
| `table.rememberToken()`        | Nullable VARCHAR(100) `remember_token`.             |
| `table.year(name)`             | YEAR integer column.                                |

<a name="column-modifiers"></a>
### Column Modifiers

```js
table.string('email')->nullable();   // see fluent form below
```

In Nodevel modifiers are chained as methods:

```js
table.string('email').nullable();
table.integer('votes').default(0);
table.string('uuid', 36).unique();
```

| Modifier         | Description                              |
| ---------------- | ---------------------------------------- |
| `.nullable()`    | Allow NULL values.                       |
| `.default(value)`| Default value (or SQL Expression).       |
| `.unsigned()`    | UNSIGNED integer columns (MySQL/MariaDB).|
| `.primary()`     | Mark as primary key.                     |
| `.unique()`      | Add a unique index.                      |
| `.index()`       | Add an index.                            |
| `.comment(text)` | Column comment (MySQL/PostgreSQL).       |

<a name="indexes"></a>
## Indexes

```js
$table.string('email').unique();

// Or after defining columns:
$table.unique('email');
$table.index(['account_id', 'created_at']);
$table.primary(['id', 'parent_id']);
```

Index names are generated automatically from the table, columns, and type.

<a name="foreign-key-constraints"></a>
## Foreign Key Constraints

```js
await schema.table('posts', (table) => {
    table.foreignId('user_id');
    table.foreign('user_id').references('id').on('users').cascadeOnDelete();
});
```

Enable/disable enforcement during migrations with `schema.enableForeignKeyConstraints()` and `schema.disableForeignKeyConstraints()`.
