# Dates

- [Introduction](#introduction)
- [Creating Dates](#creating-dates)
- [Arithmetic](#arithmetic)
- [Comparisons](#comparisons)
- [Differences](#differences)
- [Getters](#getters)
- [Formatting](#formatting)

<a name="introduction"></a>
## Introduction

> **Nodevel adaptation:** Laravel exposes Carbon via `Illuminate\Support\Facades\Date` and `Illuminate\Support\Carbon`. Nodevel ships an equivalent fluent wrapper at `Support/Date` — no external dependency required.

The `Date` class wraps JavaScript's native `Date` with the expressive API Carbon users expect: fluent arithmetic, comparisons, differences, and formatting.

```js
const { Date } = require('@nodevel/framework/src/Support/Date');

const published = Date.now().subDays(3);
```

<a name="creating-dates"></a>
## Creating Dates

```js
Date.now();                       // current moment
Date.parse('2026-08-24T12:00:00Z');
Date.create(2026, 7, 24);         // Aug 24 2026 (month is 0-indexed like native Date)
new (require('.../Date').default)('2026-01-01');
```

Invalid input throws a `TypeError` immediately instead of failing later.

<a name="arithmetic"></a>
## Arithmetic

All operations return a new instance; the original is never mutated.

```js
const now = Date.now();

now.addDays(3);
now.add(2, 'hours');
now.subMinutes(30);
now.addMonths(1);   // clamps overflow: Jan 31 -> Feb 28
now.addYears(2);

now.startOfDay();
now.endOfDay();
```

Supported generic units: `seconds`, `minutes`, `hours`, `days`, `months`, `years`.

<a name="comparisons"></a>
## Comparisons

```js
const due = Date.parse('2026-09-01');

due.isPast();       // false
due.isFuture();     // true
due.isToday();
due.isWeekend();
due.isLeapYear();

now.gt(due);        // greater than
now.lte(due);       // less than or equal
now.eq(Date.now()); // same instant
now.isSameDay(due);
now.min(due); now.max(due);
```

<a name="differences"></a>
## Differences

```js
const a = Date.parse('2026-01-01');
const b = Date.parse('2026-02-01');

a.diffInDays(b);    // -31
b.diffInHours(a);   // 744
```

Also available: `diffInSeconds`, `diffInMinutes`.

<a name="getters"></a>
## Getters

```js
const d = Date.parse('2026-08-24T15:04:05Z');

d.year;         // 2026
d.month;        // 8
d.day;          // 24
d.hour;
d.minute;
d.second;
d.timestamp;    // unix seconds
d.dayOfWeek;    // 0 (Sunday) through 6 (Saturday)
d.daysInMonth;  // 31
```

Setters mirror them and return new instances: `setYear`, `setMonth` (1-indexed), `setDay`, `setHours`, `setMinutes`.

<a name="formatting"></a>
## Formatting

```js
d.format('YYYY-MM-DD'); // "2026-08-24"
d.format('HH:mm:ss');   // "15:04:05"
d.toISOString();
d.toString();
JSON.stringify({ at: d }); // serializes to ISO-8601
```
