# CSRF Protection

- [Introduction](#introduction)
- [Preventing CSRF Requests](#preventing-csrf-requests)
    - [Excluding URIs From CSRF Protection](#excluding-uris-from-csrf-protection)
- [X-CSRF-Token](#x-csrf-token)

<a name="introduction"></a>
## Introduction

Cross-site request forgeries are malicious exploits where unauthorized commands are performed on behalf of an authenticated user. Nodevel's `csrf` global middleware (registered in `bootstrap/app.js`) protects POST/PUT/PATCH/DELETE routes by comparing the request token against the session token.

Nodevel automatically generates a CSRF token for each active session. This token validates the authenticated user actually made the request.

Whenever you define an HTML form, include a hidden `_token` field. The Blade `@csrf` directive does this for you:

```blade
<form method="POST" action="/profile">
    @csrf
    ...
</form>
```

Requests without a valid token receive an HTTP 419 response.

<a name="preventing-csrf-requests"></a>
## Preventing CSRF Requests

The middleware runs on every state-changing request routed through the web stack. JSON API clients that present no session cookie skip the check entirely — token-authenticated APIs don't need CSRF protection.

<a name="excluding-uris-from-csrf-protection"></a>
### Excluding URIs From CSRF Protection

In `bootstrap/app.js`, register wildcard exclusions (e.g. webhooks):

```js
const csrf = new VerifyCsrf();
app.withMiddlewareAliases({
    csrf,
    // ...
});

// Skip token verification for these URIs...
csrf.except(['webhooks/*']);
```

<a name="x-csrf-token"></a>
## X-CSRF-Token

For AJAX requests, send the token via header instead of form input:

```js
fetch('/profile', {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
    body: formData,
});
```
