# Authorization

- [Introduction](#introduction)
- [Gates](#gates)
    - [Writing Gates](#writing-gates)
    - [Authorizing Actions](#authorizing-actions)
- [Policies](#policies)
    - [Generating Policies](#generating-policies)
    - [Writing Policies](#writing-policies)
    - [Registering Policies](#registering-policies)

<a name="introduction"></a>
## Introduction

Authentication verifies who a user is; authorization decides what they may do. Nodevel's authorization centers on gates (closures) and policies (classes), evaluated in controllers or middleware.

<a name="gates"></a>
## Gates

<a name="writing-gates"></a>
### Writing Gates

Define gates in a service provider's `boot` method:

```js
app().make('gate').define('update-post', async (user, post) => {
    return user.getKey() === post.attributes.user_id;
});
```

<a name="authorizing-actions"></a>
### Authorizing Actions

```js
if (!(await gate.allows('update-post', user, post))) {
    const error = new Error('Not allowed');
    error.status = 403;
    throw error;
}
```

`denies()` is the inverse. Unauthorized actions should abort with 403.

<a name="policies"></a>
## Policies

Group abilities around a model in a policy class.

<a name="generating-policies"></a>
### Generating Policies

```shell
node bin/artisan.js make:policy PostPolicy --model=Post
```

<a name="writing-policies"></a>
### Writing Policies

Method names mirror the actions they authorize:

```js
class PostPolicy {
    view(user, post) { return true; }
    update(user, post) { return user.getKey() === post.attributes.user_id; }
    delete(user, post) { return this.update(user, post); }
}
```

<a name="registering-policies"></a>
### Registering Policies

Map models to policies in a provider and check through the gate:

```js
app().make('gate').policy(Post, PostPolicy);
```

For most applications the session guard plus a route middleware checking `user !== null` covers simple authorization needs.
