# Mail

- [Introduction](#introduction)
- [Generating Mailables](#generating-mailables)
- [Writing Emails](#writing-emails)
    - [Configuring the Sender](#configuring-the-sender)
    - [Configuring the Subject](#configuring-the-subject)
    - [Attaching Files](#attaching-files)
- [Sending Mail](#sending-mail)
- [Local Development](#local-development)

<a name="introduction"></a>
## Introduction

Sending emails doesn't have to be complicated. Nodevel provides drivers for writing to log files (development) and SMTP (production, via `nodemailer`).

Mail configuration lives in `config/mail.js`; the `MAIL_MAILER` environment variable selects the driver.

<a name="generating-mailables"></a>
## Generating Mailables

```shell
node bin/artisan.js make:mail OrderShipped
```

This creates a builder in `app/Mail/OrderShipped.js`.

<a name="writing-emails"></a>
## Writing Emails

Build messages with the fluent `Message` class:

```js
const { Message } = require('@nodevel/framework').Mail;

function build(user) {
    return new Message()
        .to(user.email)
        .subject('Order Shipped')
        .line('Your order is on its way!')
        .action('View Order', 'https://example.com/orders/1');
}
```

<a name="configuring-the-sender"></a>
### Configuring the Sender

Set the from address explicitly or rely on `MAIL_FROM_ADDRESS`:

```js
message.from('orders@example.com');
```

<a name="configuring-the-subject"></a>
### Configuring the Subject

```js
message.subject('Order Shipped: #1234');
```

<a name="attaching-files"></a>
### Attaching Files

```js
message.attach('storage/app/reports/invoice.pdf');
```

<a name="sending-mail"></a>
## Sending Mail

Send through the mailer service:

```js
await app().make('mailer').send(build(user));
```

Notifications integrate with mail automatically — declare `'mail'` in a notification's `via()` and implement `toMail(notifiable)`.

<a name="local-development"></a>
## Local Development

The default `log` driver writes every email as an `.eml` file under `storage/framework/mail` and logs it — no real email leaves your machine while developing.
