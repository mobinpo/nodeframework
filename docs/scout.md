# Scout Full-Text Search

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Database-Driven Search](#database-driven-search)

<a name="introduction"></a>
## Introduction

Laravel Scout provides driver-based full-text search (Meilisearch, Algolia, database) over Eloquent models with automatic index syncing via observers.

<a name="nodevel-status"></a>
## Nodevel Status

Not bundled. The `database` tier of Scout's functionality is achievable today with the query builder and SQLite FTS5 or MySQL full-text indexes.

<a name="database-driven-search"></a>
## Database-Driven Search

Add a search index migration (SQLite example):

```js
await db.statement(`
    CREATE VIRTUAL TABLE IF NOT EXISTS "posts_fts" USING fts5(
        title, body, content='posts', content_rowid='id'
    )
`);
```

Keep it in sync with a model observer:

```js
Post.listen('created', (post) => {
    post.connectionInstance().statement(
        `INSERT INTO posts_fts(rowid, title, body) VALUES (?, ?, ?)`,
        [post.getKey(), post.attributes.title, post.attributes.body]
    );
});
```

Query it fluently:

```js
const rows = await db
    .table('posts_fts')
    .join('posts', 'posts.id', 'posts_fts.rowid')
    .where('title', 'like', `%${term}%`)
    .limit(20)
    .get();
```

For hosted engines, call their REST APIs through the built-in HTTP client (`app.make('http.client')`) inside the same observer hooks — the integration points are identical to Scout's.
