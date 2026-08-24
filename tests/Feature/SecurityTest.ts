'use strict';

const { createTestApp } = require('../bootstrap');

interface TestCase {
    name: string;
    setup?(): Promise<void>;
    fn(): Promise<void>;
}

let ctx: any;

module.exports.tests = [
    {
        name: 'encryption: roundtrip and MAC tamper detection',
        async setup() {
            ctx = ctx || (await createTestApp());
        },
        async fn() {
            const { assertTrue, assertEqual } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const Encrypter =
                require('../../vendor/nodevel/framework/src/Encryption/Encrypter').default ||
                require('../../vendor/nodevel/framework/src/Encryption/Encrypter');

            const key = `base64:${Buffer.alloc(32, 7).toString('base64')}`;
            const encrypter = new Encrypter(key);

            const secret = { token: 's3cret', n: 42 };
            const payload = encrypter.encrypt(secret);
            assertTrue(typeof payload === 'string' && payload.length > 20);

            assertEqual(encrypter.decrypt(payload).token, 's3cret');

            // Tampering invalidates the MAC.
            const raw = Buffer.from(payload, 'base64');
            raw[raw.length - 1] ^= 0x01;
            let tampered = false;
            try {
                encrypter.decrypt(raw.toString('base64'));
            } catch {
                tampered = true;
            }
            assertTrue(tampered, 'tampered payload must not decrypt');

            // Container binding works with the app key.
            const fromContainer = ctx.app.make('encrypter');
            assertEqual(
                fromContainer.decrypt(fromContainer.encrypt('round-trip')),
                'round-trip'
            );
        },
    },
    {
        name: 'hashing: make/check roundtrip rejects wrong values',
        async setup() {
            ctx = ctx || (await createTestApp());
        },
        async fn() {
            const { assertTrue, assertFalse, assertEqual } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const hash = ctx.app.make('hash');
            const hashed = await hash.make('correct horse battery staple');

            assertTrue(await hash.check('correct horse battery staple', hashed));
            assertFalse(await hash.check('password123', hashed));
            assertTrue(hashed !== 'correct horse battery staple');
        },
    },
] as TestCase[];

export {};
