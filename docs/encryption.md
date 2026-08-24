# Encryption

- [Introduction](#introduction)
- [Configuration](#configuration)
- [Using the Encrypter](#using-the-encrypter)

<a name="introduction"></a>
## Introduction

Nodevel's encryption services provide a convenient interface for encrypting and decrypting text via OpenSSL using AES-256-CBC with an HMAC signature (encrypt-then-MAC). All encrypted values pass through Message Authentication Code verification, so their integrity cannot be tampered with.

<a name="configuration"></a>
## Configuration

The key is read from `APP_KEY` in your `.env`. Generate one:

```shell
npx tsx bin/artisan.ts key:generate
```

`key:generate` uses `crypto.randomBytes(32)` and stores the result base64-encoded (`base64:...`). The session cookie and Sanctum token hashing rely on this configuration.

<a name="using-the-encrypter"></a>
## Using the Encrypter

Resolve the `encrypter` binding or use the `Crypt` facade:

```js
const Crypt = require('@nodevel/framework').Facades.Crypt;

// Encrypt — objects serialize to JSON automatically.
const secret = Crypt.encrypt({ card: 4242 });

// Decrypt — throws 'The MAC is invalid.' on tampering.
const value = Crypt.decrypt(secret); // { card: 4242 }
```

Without serialization, pass `false`: `encrypt(text, false)` treats input as a plain string.

For keyed hashes of non-secret values, use HMAC directly:

```js
const Encrypter = require('@nodevel/framework').Crypt;
Encrypter.hmac(key, value);
```
