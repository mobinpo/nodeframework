# HTTP Session

- [Introduction](#introduction)
- [Configuration](#configuration)
    - [Driver Prerequisites](#driver-prerequisites)
- [Interacting With the Session](#interacting-with-the-session)
    - [Retrieving Data](#retrieving-data)
    - [Storing Data](#storing-data)
- [Flash Data](#flash-data)
- [Regenerating the Session ID](#regenerating-the-session-id)

<a name="introduction"></a>
## Introduction

HTTP sessions provide a way to store information about the user across multiple requests. Nodevel ships with a file-based session driver out of the box; sessions ride in an encrypted, signed cookie containing only the session id.

<a name="configuration"></a>
## Configuration

Session options live in `config/session.js`:

| Option     | Default            | Description                          |
| ---------- | ------------------ | ------------------------------------ |
| `driver`   | `file`             | Storage backend (`file`, `array`).   |
| `lifetime` | `120`              | Idle minutes before expiry.          |
| `cookie`   | `nodevel_session`  | Cookie name.                         |
| `domain`   | null               | Cookie domain (subdomain sharing).   |
| `http_only`| true               | JS cannot read the cookie.           |
| `same_site`| `lax`              | CSRF mitigation.                     |

The `array` driver keeps data in-process — ideal for tests.

<a name="driver-prerequisites"></a>
### Driver Prerequisites

The file driver stores session data under `storage/framework/sessions`; expired files are garbage collected automatically on access.

<a name="interacting-with-the-session"></a>
## Interacting With the Session

Access via the global helper, facade, or route closure:

```js
const session = request.session ?? session();
```

<a name="retrieving-data"></a>
### Retrieving Data

```js
const value = session.get('key', 'default');
const all = session.all();

if (session.has('users')) { /* ... */ }
```

`pull('key')` retrieves and deletes in one call.

<a name="storing-data"></a>
### Storing Data

```js
session.put('key', 'value');
session.remove('key');
session.invalidate();      // clear + new id
```

The CSRF token lives in the session; Blade's `@csrf` directive emits it:

```blade
<input type="hidden" name="_token" value="{{ csrfToken() }}">
```

<a name="flash-data"></a>
## Flash Data

Flash items exist for exactly one subsequent request — perfect for status messages:

```js
request.session.flash('status', 'Task was successful!');
```

Read flashed data with `session.getFlash('status')`.

<a name="regenerating-the-session-id"></a>
## Regenerating the Session ID

Regenerate after privilege changes (e.g. login) to prevent session fixation:

```js
session.regenerate();
```
