# Search

- [Introduction](#introduction)
- [Database Searching](#database-searching)
- [Full-Text Strategies](#full-text-strategies)

<a name="introduction"></a>
## Introduction

Nodevel ships a database-first search story. For most applications, indexed SQL queries are the fastest path to relevant results.

<a name="database-searching"></a>
## Database Searching

Combine `where` and ordering:

```js
const results = await Post.query()
    .where('title', 'like', `%${term}%`)
    .orderBy('created_at', 'desc')
    .limit(20)
    .get();
```

<a name="full-text-strategies"></a>
## Full-Text Strategies

SQLite offers FTS5 virtual tables:

```sql
CREATE VIRTUAL TABLE posts_fts USING fts5(title, body, content='posts');
```

Query the index through raw statements:

```js
const hits = await db.select(
    'SELECT p.* FROM posts p JOIN posts_fts f ON p.id = f.rowid WHERE posts_fts MATCH ?',
    [term]
);
```

Keep the index in sync inside your model's save hooks or a queued job.
