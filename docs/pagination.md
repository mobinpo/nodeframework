# Pagination

- [Introduction](#introduction)
- [Query Builder Pagination](#query-builder-pagination)
- [Eloquent Pagination](#eloquent-pagination)
- [Paginator Payload](#paginator-payload)

<a name="introduction"></a>
## Introduction

Fetching results in pages is a one-liner. Call `paginate()` instead of `get()` and you receive a structured payload with everything a UI needs.

<a name="query-builder-pagination"></a>
## Query Builder Pagination

```js
const db = app.make('db');

const users = await db.table('users').paginate(15, 1);   // 15 per page, page 1
```

Count-free pagination skips the total query:

```js
const users = await db.table('users').simplePaginate(15);
```

<a name="eloquent-pagination"></a>
## Eloquent Pagination

Works identically on model queries, hydrating models:

```js
const posts = await Post.query()
    .where('published', true)
    .paginate(10, Number(request.query().page ?? 1));
```

Return it straight from a route — the payload is JSON-ready:

```js
Route.get('/posts', async (request) => {
    const page = Number(request.query('page') ?? 1);
    return Post.query().paginate(10, page);
});
```

<a name="paginator-payload"></a>
## Paginator Payload

`paginate()` returns:

```js
{
    data: [ /* models or rows */ ],
    current_page: 1,
    last_page: 3,
    per_page: 10,
    total: 25,
    from: 1,
    to: 10,
    has_more_pages: true,
}
```

`simplePaginate()` omits `total` / `last_page` (no COUNT query):

```js
{
    data: [...],
    current_page: 1,
    per_page: 15,
    has_more_pages: true,
    next_page_url: 2,
    prev_page_url: null,
}
```
