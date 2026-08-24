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
        name: 'routing: parameters, named routes, groups',
        async setup() {
            ctx = ctx || (await createTestApp());
        },
        async fn() {
            const { assertEqual, assertTrue } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const router = ctx.app.make('router');

            // Route with a parameter + constraint + name.
            const route = router
                .get('/users/{id}', (request: any, id: string) => `User ${id}`)
                .whereNumber('id')
                .name('users.show');
            assertTrue(route.getName() === 'users.show', 'route should be named');

            // Group prefixing.
            router.group({ prefix: 'admin' }, () => {
                router.get('/dashboard', () => 'admin dash').name('admin.dashboard');
            });

            const responseA = await ctx.get('/users/42');
            assertEqual(responseA.status(), 200);
            assertEqual(responseA.content(), 'User 42');

            const responseB = await ctx.get('/users/not-a-number');
            assertEqual(responseB.status(), 404);

            const responseC = await ctx.get('/admin/dashboard');
            assertEqual(responseC.status(), 200);
            assertEqual(responseC.content(), 'admin dash');

            // Named URL generation.
            const url = ctx.app.make('url').route('users.show', { id: 7 }, false);
            assertEqual(url, '/users/7');

            // JSON responses.
            router.postJson = undefined;
            router.get('/api/ping', () => ({ pong: true }));
            const responseD = await ctx.getJson('/api/ping');
            assertEqual(responseD.status(), 200);
            assertEqual(responseD.json('pong'), true);
        },
    },
] as TestCase[];

export {};
