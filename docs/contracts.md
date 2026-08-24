# Contracts

- [Introduction](#introduction)
- [Contract Reference](#contract-reference)

<a name="introduction"></a>
## Introduction

Contracts are interfaces that define the core services of the framework. In JavaScript they are documented conventions plus structural checks — code against the shape, not the concrete class.

```js
// Depend on what the container resolves, not how it was built:
const cache = app.make('cache');   // any cache implementation works
```

Swapping implementations in tests or alternate drivers requires no changes to consuming code.

<a name="contract-reference"></a>
## Contract Reference

| Binding          | Contract shape                                        |
| ---------------- | ----------------------------------------------------- |
| `cache`          | `get`, `put`, `forget`, `flush`, `store(name)`        |
| `db`             | `select`, `statement`, `table`, `transaction`         |
| `encrypter`      | `encrypt`, `decrypt`, `encryptString`, `decryptString`|
| `events`         | `dispatch`, `listen`, `subscribe`                     |
| `hash`           | `make`, `check`                                       |
| `http.client`    | `get`, `post`, `put`, `patch`, `delete`               |
| `logger`         | `emergency` … `debug`, `error`                        |
| `mailer`         | `send`, `raw`, `failures`                             |
| `queue`          | `connection(name)`, `push`, `later`                   |
| `session.manager`| `startForRequest(request)`                            |
| `storage`        | `disk(name)`, `exists`, `put`, `get`, `delete`        |
| `url`            | `to`, `route`, `current`                              |

Resolve any of them via the container and program against these methods:

```js
const events = app.make('events');
events.dispatch('user.registered', [user]);
```

Any object implementing the same methods may be bound in its place:

```js
app.instance('events', new FakeDispatcher());
```
