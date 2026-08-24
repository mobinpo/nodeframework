# Eloquent: Collections

- [Introduction](#introduction)
- [Available Methods](#available-methods)
    - [Custom Collections](#custom-collections)

<a name="introduction"></a>
## Introduction

All Eloquent methods returning more than one result (`all`, `get`) return an `EloquentCollection` — a fluent wrapper extending the base collection with model-aware helpers.

```js
const flights = await Flight.query().where('destination', 'Paris').get();

// Reject models from the collection:
const active = flights.reject((flight) => flight.cancelled);
```

Collections are iterable:

```js
for (const flight of flights) console.log(flight.name);
```

<a name="available-methods"></a>
## Available Methods

All base collection methods work on Eloquent collections. The most used:

| Method        | Description                                          |
| ------------- | ---------------------------------------------------- |
| `each(fn)`    | Iterate items; return false to stop.                 |
| `map(fn)`     | Transform each item.                                 |
| `filter(fn)`  | Keep matching items (no callback: drop empties).     |
| `reject(fn)`  | Inverse of filter.                                   |
| `pluck(key)`  | Extract a field from every item.                     |
| `keyBy(key)`  | Index items by a field.                              |
| `groupBy(key)`| Group into sub-collections.                          |
| `sortBy(fn)`  | Sort by accessor or comparator value.                |
| `sum(field)`  | Sum of a field across items.                         |
| `count()`     | Item count.                                          |
| `first()` / `last()` | First / last item, optionally filtered.       |
| `contains(v)` | Whether an item exists.                              |
| `unique(key)` | Deduplicate by key.                                  |
| `chunk(size)` | Split into chunks of N.                              |
| `take(n)` / `skip(n)` | Slice the collection.                        |
| `toArray()`   | Serializes every model to plain arrays.              |
| `toJson()`    | JSON string of all models.                           |

Model-specific additions:

| Method        | Description                                   |
| ------------- | --------------------------------------------- |
| `modelKeys()` | Array of primary keys for contained models.   |
| `find(id)`    | Locate a model in the collection by key.      |

<a name="custom-collections"></a>
### Custom Collections

Because collections extend the shared base implementation, application-wide macros and helper functions compose naturally — pass any collection method result back into `new Collection(...)` for chaining.
