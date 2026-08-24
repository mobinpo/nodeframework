# Notifications

- [Introduction](#introduction)
- [Creating Notifications](#creating-notifications)
- [Sending Notifications](#sending-notifications)
- [Mail Notifications](#mail-notifications)
- [Database Notifications](#database-notifications)
- [Broadcast Notifications](#broadcast-notifications)

<a name="introduction"></a>
## Introduction

In addition to email, Nodevel supports sending notifications across a variety of delivery channels — mail, database, and broadcast. For example, imagine an invoice is paid: you might send one notification class over the mail and database channels.

Notifications are typically short, informational messages about something in your application.

<a name="creating-notifications"></a>
## Creating Notifications

```shell
node bin/artisan.js make:notification InvoicePaid
```

Each notification class declares its channels via `via()` and per-channel builder methods:

```js
class InvoicePaid extends Notification {
    via() { return ['mail', 'database']; }

    toMail(notifiable) {
        return new Message()
            .to(notifiable.attributes.email)
            .subject('Invoice Paid')
            .line('Thanks for your purchase!');
    }

    toArray(notifiable) {
        return { invoice_id: 1 };
    }
}
```

<a name="sending-notifications"></a>
## Sending Notifications

Send through the notifications service:

```js
await app().make('notifications').send(user, new InvoicePaid());
```

Any object with attributes works as a notifiable; `routeNotificationFor(channel)` customizes routing (e.g. an alternate email address).

<a name="mail-notifications"></a>
## Mail Notifications

`toMail` returns a Message; the mail channel delivers it through your configured [mailer](mail.md).

<a name="database-notifications"></a>
## Database Notifications

The `toArray()` payload is stored in the `notifications` table keyed by type and notifiable. Read a user's notifications through the database:

```js
const rows = await app().make('db')
    .table('notifications')
    .where('notifiable_id', user.getKey())
    .get();
```

<a name="broadcast-notifications"></a>
## Broadcast Notifications

The `'broadcast'` channel pushes `toArray()` data to the notifiable's private broadcast channel (`App.Models.User.{id}`), where client-side listeners receive real-time updates.
