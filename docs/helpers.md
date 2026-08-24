# Helpers

- [Introduction](#introduction)
- [Available Methods](#available-methods)
    - [Arrays and Objects](#arrays-and-objects)
    - [Paths](#paths)
    - [Miscellaneous](#miscellaneous)

<a name="introduction"></a>
## Introduction

Nodevel includes a variety of global "helper" functions registered onto the global scope at boot, so they are available anywhere without imports.

<a name="available-methods"></a>
## Available Methods

<a name="arrays-and-objects"></a>
### Arrays and Objects

| Method                    | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `env(key, default)`       | Read an environment variable.                        |
| `config(key, default)`    | Read a configuration value with dot notation.        |
| `app()`                   | The application / service container instance.        |

<a name="paths"></a>
### Paths

| Method                  | Description                            |
| ----------------------- | -------------------------------------- |
| `base_path(...segs)`    | Application root directory.            |
| `app_path(...segs)`     | The `app` directory.                   |
| `config_path(...segs)`  | The `config` directory.                |
| `database_path(...s)`   | The `database` directory.              |
| `resource_path(...s)`   | The `resources` directory.             |
| `storage_path(...s)`    | The `storage` directory.               |
| `public_path(...segs)`  | The `public` directory.                |

<a name="miscellaneous"></a>
### Miscellaneous

| Method                       | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `view(name, data)`           | Create a view instance.                           |
| `response()`                 | Response factory (`json`, `make`, `noContent`).   |
| `redirect(to)` / `redirect()->route(name)` | Redirect responses.                |
| `url(path)` / `asset(path)`  | Generate URLs.                                    |
| `session()`                  | Session manager.                                  |
| `auth()`                     | Auth manager.                                     |
| `event(eventInstance)`       | Dispatch an event.                                |
| `now()`                      | Current date.                                     |
