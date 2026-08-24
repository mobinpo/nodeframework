# Broadcasting

- [Introduction](#introduction)
- [Configuration](#configuration)
    - [Supported Drivers](#supported-drivers)
- [Defining Broadcast Events](#defining-broadcast-events)
- [Authorizing Channels](#authorizing-channels)
    - [Channel Classes](#channel-classes)
- [Listening for Events](#listening-for-events)
- [Presence Channels](#presence-channels)

<a name="introduction"></a>
## Introduction

In many modern web applications, WebSockets implement real-time, live-updating user interfaces. Nodevel makes it easy to "broadcast" server-side events over a WebSocket connection so the same event names and data are shared between your server and client JavaScript.

The core concepts: clients connect to named channels on the frontend; your application broadcasts events to those channels from the backend.

<a name="configuration"></a>
## Configuration

All broadcasting configuration lives in `config/broadcasting.js`. Set `BROADCAST_CONNECTION` in `.env` to select a driver.

<a name="supported-drivers"></a>
### Supported Drivers

| Driver  | Description                                              |
| ------- | -------------------------------------------------------- |
| `log`   | Writes broadcasts to logs — local development.           |
| `pusher`| Pusher Channels (requires the `pusher` npm package).     |
| `array` | Collects broadcasts in memory — testing.                 |
| `null`  | Discards all broadcasts.                                 |

<a name="defining-broadcast-events"></a>
## Defining Broadcast Events

An event class declares its channels with `broadcastOn`, optionally customizing the payload:

```js
class ServerCreated {
    constructor(user) { this.user = user; }

    broadcastOn() {
        return [new PrivateChannel(`user.${this.user.getKey()}`)];
    }

    broadcastWith() {
        return { id: this.user.getKey() };
    }
}
```

Broadcast through the manager:

```js
await app().make('broadcast').queueEvent(new ServerCreated(user));
```

<a name="authorizing-channels"></a>
## Authorizing Channels

Private channels require authorization. Register callbacks — typically in a service provider or `routes/channels.js`:

```js
const { channelRegistry } = require('@nodevel/framework').Broadcasting;

channelRegistry.channel('orders.{orderId}', async (user, orderId) => {
    return Number(user.getKey()) === Number(orderId);
});
```

The callback receives the authenticated user plus wildcard parameters; returning truthy authorizes the subscription. Presence channels return an array of user metadata instead of `true`.

<a name="channel-classes"></a>
### Channel Classes

Generate a channel class for complex logic:

```shell
npx tsx bin/artisan.ts make:channel OrderChannel
```

```js
class OrderChannel {
    async join(user, order) {
        return user.getKey() === order.user_id;
    }
}
```

<a name="listening-for-events"></a>
## Listening for Events

On the client, subscribe via any Pusher-protocol client pointed at your WebSocket server; event names default to the class name (customize with `broadcastAs()`).

<a name="presence-channels"></a>
## Presence Channels

Presence channels build on private-channel security while exposing who is subscribed — ideal for chat rooms and collaborative UIs. Authorization callbacks return per-user data made available to other subscribers.
