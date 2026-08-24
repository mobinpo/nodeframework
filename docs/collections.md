# Collections

- [Introduction](#introduction)
- [Creating Collections](#creating-collections)
- [Available Methods](#available-methods)

<a name="introduction"></a>
## Introduction

The `Illuminate\Support\Collection` class provides a fluent, convenient wrapper for working with arrays of data. Nodevel ships the equivalent in `@nodevel/framework` — every query and Eloquent result passes through it.

<a name="creating-collections"></a>
## Creating Collections

```js
const { Collection } = require('@nodevel/framework');

const collection = new Collection([1, 2, 3]);
```

As mentioned above, the `get` method of an Eloquent query always returns a `Collection` instance:

```js
const users = await User.where('active', true).get();

// users is a Collection of User models
const active = users.filter((user) => user.attributes.active);
```

Collections are also created by many framework helpers:

```js
collect([1, 2, 3]);
```

<a name="available-methods"></a>
## Available Methods

For the remainder of this documentation we will discuss each method available on the `Collection` class. All methods may be fluently chained:

```js
const result = collect(users)
    .filter((user) => user.age > 18)
    .map((user) => user.name)
    .sortBy('name');
```

<div class="collection-method-list" markdown="1">

- [all](#method-all)
- [avg](#method-avg)
- [chunk](#method-chunk)
- [collapse](#method-collapse)
- [concat](#method-concat)
- [contains](#method-contains)
- [count](#method-count)
- [each](#method-each)
- [every](#method-every)
- [filter](#method-filter)
- [first](#method-first)
- [firstWhere](#method-firstwhere)
- [flatMap](#method-flatmap)
- [flatten](#method-flatten)
- [groupBy](#method-groupby)
- [isEmpty](#method-isempty)
- [isNotEmpty](#method-isnotempty)
- [keyBy](#method-keyby)
- [last](#method-last)
- [map](#method-map)
- [max](#method-max)
- [merge](#method-merge)
- [min](#method-min)
- [pluck](#method-pluck)
- [reduce](#method-reduce)
- [reject](#method-reject)
- [reverse](#method-reverse)
- [skip](#method-skip)
- [slice](#method-slice)
- [some](#method-some)
- [sortBy](#method-sortby)
- [sortDesc / sortByDesc](#method-sortdesc)
- [sum](#method-sum)
- [takeUntil style helpers via slice/skip](#method-slice)

</div>

#### `all()`

Returns the underlying array:

```js
collect([1, 2, 3]).all(); // [1, 2, 3]
```

#### `avg()`

The average value:

```js
collect([1, 2, 3]).avg(); // 2
```

#### `chunk()`

Break into multiple collections of a given size:

```js
collect([1, 2, 3, 4]).chunk(2); // [[1, 2], [3, 4]]
```

#### `collapse()`

Collapse an array of arrays into one:

```js
collect([[1, 2], [3]]).collapse(); // [1, 2, 3]
```

#### `concat()`

Append items:

```js
collect([1]).concat([2]); // [1, 2]
```

#### `contains()`

Whether the collection contains a given item:

```js
collect({ name: 'Nodevel' }).contains('Nodevel'); // true
```

#### `count()`

Number of items:

```js
collect([1, 2, 3]).count(); // 3
```

#### `each()`

Iterate over items:

```js
collect([1, 2]).each((item) => console.log(item));
```

#### `every()`

Verify all items pass a truth test:

```js
collect([2, 4]).every((n) => n % 2 === 0); // true
```

#### `filter()`

Keep items passing the truth test:

```js
collect([1, 2, 3]).filter((n) => n > 1).items; // [2, 3]
```

#### `first()`

First item passing an optional truth test:

```js
collect([1, 2]).first((n) => n > 1); // 2
```

#### `firstWhere()`

First item where a key matches a value:

```js
users.firstWhere('name', 'Taylor');
```

#### `flatMap()`

Map then flatten one level:

```js
collect([1, 2]).flatMap((n) => [n, n * 10]);
```

#### `flatten()`

Flatten nested arrays:

```js
collect([1, [2, [3]]]).flatten();
```

#### `groupBy()`

Group items by a key:

```js
collect(users).groupBy('department');
```

#### `isEmpty()` / `isNotEmpty()`

Emptiness checks.

#### `keyBy()`

Key by a field:

```js
collect(users).keyBy('email');
```

#### `last()`

The last item.

#### `map()`

Transform each item:

```js
collect([1, 2]).map((n) => n * 2).items; // [2, 4]
```

#### `max()` / `min()`

Largest and smallest values.

#### `merge()`

Merge arrays or objects.

#### `pluck()`

All values for a key:

```js
collect(users).pluck('email');
```

#### `reduce()`

Reduce to a single value:

```js
collect([1, 2, 3]).reduce((carry, n) => carry + n, 0); // 6
```

#### `reject()`

Inverse of `filter`.

#### `reverse()`

Reverse order.

#### `skip()`

Skip N items:

```js
collect([1, 2, 3]).skip(1).items; // [2, 3]
```

#### `slice()`

Slice a portion of the collection.

#### `some()`

Alias of `contains`.

#### `sortBy()` / `sortDesc()`

Sort by a key or callback, ascending or descending:

```js
collect(users).sortBy('age');
collect(users).sortDesc('age');
```

#### `sum()`

Sum of values:

```js
collect([1, 2]).sum(); // 3
```
