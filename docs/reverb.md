# Reverb WebSockets

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Broadcasting Without a WebSocket Server](#broadcasting-without-a-server)

<a name="introduction"></a>
## Introduction

Laravel Reverb is a first-party WebSocket server for real-time communication, paired with Laravel Echo on the client.

<a name="nodevel-status"></a>
## Nodevel Status

Nodevel does not ship its own WebSocket server. Broadcasting is driver-based: the `log`, `pusher` (requires `npm install pusher`), and in-memory `array` drivers are included and configured through `config/broadcasting.js`.

<a name="broadcasting-without-a-server"></a>
## Broadcasting Without a Server

For self-hosted real-time, point the `pusher` connection at any Pusher-protocol-compatible server (e.g. an open-source Soketi-style deployment) — no code changes:

```js
// config/broadcasting.js
module.exports = (env) => ({
    default: env('BROADCAST_CONNECTION', 'log'),

    connections: {
        pusher: {
            app_id: env('PUSHER_APP_ID'),
            app_key: env('PUSHER_APP_KEY'),
            app_secret: env('PUSHER_APP_SECRET'),
            app_cluster: env('PUSHER_APP_CLUSTER', 'mt1'),
        },
        log: {},
    },
});
```

Events declare their channels and payload; broadcasting is queued through the manager:

```js
class OrderShipped {
    broadcastOn() {
        return [`orders.${this.order.id}`];
    }
    broadcastWith() {
        return { status: this.order.attributes.status };
    }
}

await app.make('broadcast').queueEvent(new OrderShipped());
```

Private/presence channel authorization registers through the shared registry (`channelRegistry.channel('orders.{orderId}', callback)`) exactly as documented in [broadcasting](/framework/docs/broadcasting).
