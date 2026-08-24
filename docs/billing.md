# Billing (Cashier)

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Implementing Subscriptions](#implementing-subscriptions)

<a name="introduction"></a>
## Introduction

Laravel Cashier provides an expressive, fluent interface to Stripe and Paddle subscription management. Nodevel does not bundle a Cashier equivalent.

<a name="nodevel-status"></a>
## Nodevel Status

Not implemented. Billing requires PCI-sensitive provider integrations that are best served by the provider's own SDKs.

<a name="implementing-subscriptions"></a>
## Implementing Subscriptions

To add billing to a Nodevel application, use the payment provider's official Node SDK behind your own service class:

```js
// app/Services/Billing.js
class Billing {
    static inject = ['http.client'];

    constructor(httpClient) {
        this.http = httpClient.withToken(process.env.PROVIDER_SECRET);
    }

    async createCheckout(user, priceId) {
        return this.http.post('https://api.provider.com/checkouts', {
            customer_email: user.attributes.email,
            price: priceId,
        });
    }
}
```

Register it in `app/Providers/AppServiceProvider.php`-style boot:

```js
this.app.singleton('billing', () => new (require('../app/Services/Billing'))(this.app.make('http.client')));
```

Store plan state on the `users` table with a migration (`table.string('stripe_id').nullable()`), and verify webhooks in a CSRF-excluded route (`csrf.except(['webhooks/*'])` is already the pattern shown in `bootstrap/app.js`).
