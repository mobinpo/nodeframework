# Service Container

- [Introduction](#introduction)
- [Binding](#binding)
    - [Binding Basics](#binding-basics)
    - [Binding A Singleton](#binding-a-singleton)
    - [Binding Instances](#binding-instances)
    - [Binding Interfaces to Implementations](#binding-interfaces-to-implementations)
    - [Contextual Binding](#contextual-binding)
    - [Tagging](#tagging)
- [Resolving](#resolving)
    - [The Make Method](#the-make-method)
    - [Automatic Injection](#automatic-injection)

<a name="introduction"></a>
## Introduction

The Nodevel service container is a powerful tool for managing class dependencies and performing dependency injection. Since JavaScript has no constructor type-hints, dependencies are declared with a `static inject` property listing the container binding names:

```js
class PodcastController {
    static inject = ['apple.music'];

    constructor(appleMusic) {
        this.apple = appleMusic;
    }

    async show(request, id) {
        return view('podcasts.show', { podcast: await this.apple.findPodcast(id) });
    }
}
```

Because the service is injected, you can easily "mock" the service when testing your application.

<a name="binding"></a>
## Binding

<a name="binding-basics"></a>
### Binding Basics

Almost all of your service container bindings will be registered within service providers, so most examples use the container in that context. Within a provider, access the container via `this.app`:

```js
this.app.bind('transistor', (container) => {
    return new Transistor(container.make('podcast.parser'));
});
```

A binding registered with a string implementation acts as a lazy alias:

```js
this.app.bind('event.pusher', 'redis.event.pusher');
```

Use `bindIf` to register only if no binding exists.

<a name="binding-a-singleton"></a>
### Binding A Singleton

The `singleton` method binds a class or closure into the container that should only be resolved one time; subsequent calls return the same instance:

```js
this.app.singleton('transistor', () => new Transistor());
```

`scoped` behaves like `singleton` for request/job lifecycles.

<a name="binding-instances"></a>
### Binding Instances

Bind an existing object instance using `instance`. The given instance is always returned on subsequent resolutions:

```js
const service = new Transistor(new PodcastParser());
this.app.instance('transistor', service);
```

<a name="binding-interfaces-to-implementations"></a>
### Binding Interfaces to Implementations

Bind an abstract contract to a concrete class:

```js
this.app.bindClass('App.Contracts.EventPusher', RedisEventPusher);

// Now anything injecting 'App.Contracts.EventPusher' receives an instance.
class PodcastController {
    static inject = ['App.Contracts.EventPusher'];
}
```

Decorate existing services with `extend`:

```js
this.app.extend('transistor', (service) => new DecoratedService(service));
```

<a name="contextual-binding"></a>
### Contextual Binding

Sometimes two classes utilize the same interface but should receive different implementations:

```js
this.app.when(PhotoController).needs('filesystem').give(() => Storage.disk('local'));
this.app.when(UploadController).needs('filesystem').give(() => Storage.disk('s3'));
```

<a name="tagging"></a>
### Tagging

Occasionally you may need to resolve all of a certain "category" of binding:

```js
this.app.tag(['CpuReport', 'MemoryReport'], 'reports');
const reports = this.app.tagged('reports');
```

<a name="resolving"></a>
## Resolving

<a name="the-make-method"></a>
### The Make Method

```js
const transistor = this.app.make('transistor');

if (this.app.bound('transistor')) { /* ... */ }
```

Outside a provider, use the global `app()` helper or the `App` facade:

```js
const transistor = app().make('transistor');
```

`makeWith` passes explicit constructor parameters that override resolution.

<a name="automatic-injection"></a>
### Automatic Injection

Classes resolved by the container — controllers, event listeners, middleware, commands — receive their declared dependencies automatically:

```js
class PodcastStats {
    async generate() {
        // ...
    }
}

// The controller declares its dependency:
class StatsController {
    static inject = ['podcast.stats'];
    constructor(podcastStats) { this.stats = podcastStats; }
}

// Register it:
app().bindClass('podcast.stats', PodcastStats);
```
