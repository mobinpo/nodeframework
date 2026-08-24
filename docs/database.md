# Database: Getting Started

- [Introduction](#introduction)
- [Configuration](#configuration)
- [Running Raw SQL Statements](#running-raw-sql-statements)
    - [Select Statements](#select-statements)
    - [Insert / Update / Delete Statements](#insert-update-delete-statements)
- [Database Transactions](#database-transactions)

<a name="introduction"></a>
## Introduction

Nodevel makes interacting with databases easy across SQLite, MySQL, and PostgreSQL. Queries use parameter binding to protect against SQL injection.

<a name="configuration"></a>
## Configuration

Database configuration lives in `config/database.js`. The `DB_CONNECTION` environment variable selects the driver; SQLite works out of the box (`database/database.sqlite`).

```ini
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

MySQL / PostgreSQL need host, port, database, username, and password variables.

<a name="running-raw-sql-statements"></a>
## Running Raw SQL Statements

Use the `db` service:

```js
const db = app.make('db');
```

<a name="select-statements"></a>
### Select Statements

```js
const users = await db.select('SELECT * FROM users WHERE active = ?', [1]);

const row = await db.selectOne('SELECT * FROM users WHERE id = ?', [1]);
```

<a name="insert-update-delete-statements"></a>
### Insert / Update / Delete Statements

`statement` returns affected row counts where the driver supports it:

```js
await db.statement(
    'INSERT INTO users (name, email) VALUES (?, ?)',
    ['Taylor', 'taylor@example.com']
);

await db.statement('UPDATE users SET votes = 100 WHERE id = ?', [1]);

await db.statement('DELETE FROM users WHERE id = ?', [1]);
```

Prefer the [query builder](/docs/queries) over raw SQL when possible.

<a name="database-transactions"></a>
## Database Transactions

Run a set of operations inside a transaction:

```js
await db.transaction(async () => {
    await db.table('users').where('id', 1).update({ votes: 1 });
    await db.table('posts').insert({ title: 'New', user_id: 1 });
});
```

An exception inside the callback rolls everything back automatically.
