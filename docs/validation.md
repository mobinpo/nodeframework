# Validation

- [Introduction](#introduction)
- [Validation Quickstart](#validation-quickstart)
    - [Defining the Routes](#defining-the-routes)
    - [Validating the Request](#validating-the-request)
- [Working With Error Messages](#working-with-error-messages)
- [Form Requests](#form-requests)
- [Available Validation Rules](#available-validation-rules)

<a name="introduction"></a>
## Introduction

Nodevel provides several different approaches to validate your application's incoming data, mirroring Laravel's rule syntax with pipe-separated strings.

<a name="validation-quickstart"></a>
## Validation Quickstart

<a name="validating-the-request"></a>
### Validating the Request

```js
const { Validator } = require('@nodevel/framework').Validation;

Route.post('/user', async (request) => {
    const validated = Validator.validate(request.all(), {
        title: 'required|unique:posts|max:255',
        body: 'required',
        email: 'required|email',
        publish_at: 'nullable|date',
    });

    // The data is valid — continue storing it.
});
```

If validation fails, a `ValidationException` is thrown with a 422 status; the framework converts it into an error response automatically.

To collect errors without throwing:

```js
const validator = Validator.make(request.all(), rules);

if (validator.fails()) {
    return response().json({ errors: validator.errors() }, 422);
}

const valid = validator.validated();
```

Database-backed rules (`unique`, `exists`) are resolved during the asynchronous validation pass:

```js
request.errors = validator;
await validator.validateAsync(app);
```

<a name="working-with-error-messages"></a>
## Working With Error Messages

`validator.errors()` returns an object keyed by attribute, each containing an array of messages:

```json
{
    "email": ["The email must be a valid email address."]
}
```

Custom messages may be supplied as the third argument to `Validator.make`, keyed by rule or `attribute.rule`.

In Blade views the `@error('title') ... @enderror` directive displays the first message for a field.

<a name="form-requests"></a>
## Form Requests

For complex scenarios encapsulate rules and authorization in a form request class:

```shell
npx tsx bin/artisan.ts make:request StorePostRequest
```

```js
const FormRequest = require('@nodevel/framework').Validation.FormRequest;

class StorePostRequest extends FormRequest {
    static rules() {
        return {
            title: 'required|string|max:255',
            body: 'required',
        };
    }

    static authorize(request) {
        return Boolean(request.user());
    }
}
```

Validate inside a controller:

```js
const input = await StorePostRequest.validateRequest(app, request);
```

Authorization failures throw a 403 error; validation failures throw 422.

<a name="available-validation-rules"></a>
## Available Validation Rules

| Rule                       | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| `required`                 | Field must be present and non-empty.                     |
| `nullable`                 | Allow null / empty values (skips other rules).           |
| `string`                   | Must be a string.                                        |
| `integer`                  | Must be an integer.                                      |
| `numeric`                  | Must be numeric.                                         |
| `boolean`                  | Must be true/false (accepts "1", "0", true, false).      |
| `array`                    | Must be an array.                                        |
| `json`                     | Must be valid JSON.                                      |
| `email`                    | Must be a valid email address.                           |
| `url`                      | Must be a valid URL.                                     |
| `uuid`                     | Must be a UUID.                                          |
| `date`                     | Must be parseable as a date.                             |
| `min:x` / `max:x`          | Minimum/maximum size or value.                           |
| `between:a,b`              | Size/value between bounds.                               |
| `size:x`                   | Exact size.                                              |
| `in:a,b,c`                 | Value in list.                                           |
| `not_in:a,b,c`             | Value not in list.                                       |
| `distinct`                 | No duplicate array values.                               |
| `confirmed`                | Must match `{field}_confirmation`.                       |
| `same:other`               | Must match another field.                                |
| `different:other`          | Must differ from another field.                          |
| `regex:pattern`            | Must match regex.                                        |
| `starts_with:a,b`          | Starts with one of the given prefixes.                   |
| `ends_with:a,b`            | Ends with one of the given suffixes.                     |
| `unique:table,column,id`   | Not already present in the database table.               |
| `exists:table,column`      | Present in the database table.                           |
