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
        name: 'session: put/get, flash, csrf token and regeneration',
        async setup() {
            ctx = ctx || (await createTestApp());
        },
        async fn() {
            const { assertEqual, assertTrue } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const { Store, ArraySessionHandler } =
                require('../../vendor/nodevel/framework/src/Session/SessionManager');

            const s = new Store(new ArraySessionHandler(120), 'a'.repeat(24), 'nodevel_session');

            s.put('color', 'teal');
            assertEqual(s.get('color'), 'teal');
            assertTrue(s.has('color'));

            s.flash('status', 'saved');
            assertEqual(s.getFlash('status'), 'saved');

            // CSRF token is stable within a session and non-empty.
            const token = s.token();
            assertTrue(typeof token === 'string' && token.length >= 20);
            assertEqual(s.token(), token);

            // Regeneration rotates the session id.
            const before = s.id;
            const after = s.regenerate();
            assertTrue(after !== before && after.length >= 16);
        },
    },
    {
        name: 'sanctum-style tokens: issue, authenticate, abilities',
        async setup() {
            ctx = ctx || (await createTestApp());
        },
        async fn() {
            const { assertEqual, assertTrue } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const { Sanctum, useApplication } =
                require('../../vendor/nodevel/framework/src/Auth/AuthManager');
            useApplication(ctx.app);

            const { User } = require('../../app/Models/User');

            const users = ctx.app.make('db').table('users');
            let record = await users.where('email', 'token-user@example.com').first();
            if (!record) {
                const id = await users.insertGetId({
                    name: 'Token User',
                    email: 'token-user@example.com',
                    password: 'x',
                });
                record = await users.where('id', id).first();
            }

            // Bypass mass-assignment protection: copy the full record.
            const user = new User({});
            user.attributes = { ...record };
            const issued = await Sanctum.createToken(user, 'ci');
            assertTrue(typeof issued.plainTextToken === 'string');

            const authenticated = await Sanctum.authenticate(issued.plainTextToken, ctx.app);
            assertTrue(Boolean(authenticated), 'token should authenticate');
            assertEqual(String(authenticated.id), String(user.getKey()));
        },
    },
] as TestCase[];

export {};
