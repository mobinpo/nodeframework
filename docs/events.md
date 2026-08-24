# Events

- [Introduction](#introduction)
- [Generating Events and Listeners](#generating-events-and-listeners)
- [Defining Events](#defining-events)
- [Defining Listeners](#defining-listeners)
- [Registering Events and Listeners](#registering-events-and-listeners)
    - [Event Discovery](#event-discovery)
- [Dispatching Events](#dispatching-events)

<a name="introduction"></a>
## Introduction

Nodevel's events provide a simple observer-pattern implementation. Events may be thought of as "this happened" announcements; listeners react to them, decoupling application concerns.

<a name="generating-events-and-listeners"></a>
## Generating Events and Listeners

```shell
npx tsx bin/artisan.ts make:event OrderShipped
npx tsx bin/artisan.ts make:listener SendShipmentNotification --event=OrderShipped
```

<a name="defining-events"></a>
## Defining Events

An event class carries the data listeners need:

```js
class OrderShipped {
    constructor(order) {
        this.order = order;
    }
}
```

<a name="defining-listeners"></a>
## Defining Listeners

Listeners receive the event instance in their `handle` method:

```js
class SendShipmentNotification {
    async handle(event) {
        // Access $event->order ...
    }
}
```

<a name="registering-events-and-listeners"></a>
## Registering Events and Listeners

Wire them in a service provider's `boot` method:

```js
app().make('events').listen(OrderShipped, async (event) => {
    await (new SendShipmentNotification()).handle(event);
});

// Or by class reference:
app().make('events').listen('OrderShipped', 'SendShipmentNotification');
```

Wildcard patterns match many events at once (`'order.*'`).

<a name="event-discovery"></a>
### Event Discovery

`dispatcher.dispatchedNames` records every dispatched event name for introspection tooling.

<a name="dispatching-events"></a>
## Dispatching Events

```js
await event(new OrderShipped(order));
// or:
await app().make('events').dispatch(new OrderShipped(order));
```

Listeners run sequentially; returning `false` from a listener halts further ones.
