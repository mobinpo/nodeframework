'use strict';

const crypto = require('crypto');

export {};

/**
 * Encryption — the equivalent of `Illuminate\Encryption\Encrypter`.
 *
 * Uses AES-256-CBC with an HMAC signature (encrypt-then-MAC), matching
 * Laravel's payload shape: base64 JSON of `{ iv, value, mac }`.
 */
class Encrypter {
    key: Buffer | null;
    cipher: string;

    constructor(key: string | null = null, cipher: string = 'AES-256-CBC') {
        this.key = key ? normalizeKey(key) : null;
        this.cipher = cipher;
    }

    setKey(key: string): void {
        this.key = normalizeKey(key);
    }

    /**
     * Encrypt a value. Objects are serialized to JSON first.
     */
    encrypt(value: any, serialize: boolean = true): string {
        const iv = crypto.randomBytes(16);
        const plaintext = serialize ? JSON.stringify(value) : String(value);

        const cipherStream = crypto.createCipheriv(this.cipher, this.key as Buffer, iv);
        let encrypted = cipherStream.update(plaintext, 'utf8', 'base64');
        encrypted += cipherStream.final('base64');

        const mac = hmac(this.key as Buffer, `${iv.toString('base64')}.${encrypted}`);

        return Buffer.from(
            JSON.stringify({ iv: iv.toString('base64'), value: encrypted, mac })
        ).toString('base64');
    }

    /**
     * Decrypt a value produced by `encrypt`. Throws when the MAC is invalid
     * (tamper detection) or the payload is malformed.
     */
    decrypt(payload: unknown, unserialize: boolean = true): any {
        let parsed;
        try {
            parsed = JSON.parse(Buffer.from(String(payload), 'base64').toString('utf8'));
        } catch {
            throw new Error('The payload is invalid.');
        }

        if (!parsed || typeof parsed.iv !== 'string' || typeof parsed.value !== 'string' || typeof parsed.mac !== 'string') {
            throw new Error('The payload is invalid.');
        }

        const expectedMac = hmac(this.key as Buffer, `${parsed.iv}.${parsed.value}`);
        if (!timingSafeEqual(expectedMac, parsed.mac)) {
            throw new Error('The MAC is invalid.');
        }

        const decipher = crypto.createDecipheriv(
            this.cipher,
            this.key as Buffer,
            Buffer.from(parsed.iv, 'base64')
        );
        let decrypted = decipher.update(parsed.value, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return unserialize ? JSON.parse(decrypted) : decrypted;
    }

    /** Compute a keyed hash — `hash_hmac` equivalent used across the framework. */
    static hmac(key: string, value: string): string {
        return hmac(normalizeKey(key), value);
    }
}

function normalizeKey(key: string): Buffer {
    if (key.startsWith('base64:')) {
        return Buffer.from(key.slice(7), 'base64');
    }
    return Buffer.from(String(key), 'utf8');
}

function hmac(key: Buffer, value: string): string {
    return crypto.createHmac('sha256', key).update(value).digest('hex');
}

function timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = Encrypter;
