# Precognition

- [Introduction](#introduction)
- [How It Works](#how-it-works)

<a name="introduction"></a>
## Introduction

"Precognition" lets frontend code validate inputs without submitting the form. The client asks the server to run validation rules against partial input and receives only the errors.

<a name="how-it-works"></a>
## How It Works

Send the special header with your validation request:

```js
fetch('/posts', {
    method: 'POST',
    headers: {
        'precognition': 'true',
        'precognition-validate-only': 'title,body',
    },
    body: formData,
});
```

When the header is present, Nodevel's FormRequest pipeline validates only the listed fields and responds with a 204 on success or a 422 JSON payload of errors on failure — no side effects run.

```json
{
    "message": "The given data was invalid.",
    "errors": { "title": ["The title field is required."] }
}
```

Pair this with your favorite reactive frontend; the contract stays identical to a full form submission.
