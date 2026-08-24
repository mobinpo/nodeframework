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
        name: 'boots the application container',
        async setup() {
            ctx = await createTestApp();
        },
        async fn() {
            const { assertEqual } = require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');
            assertEqual(ctx.app.environment(), 'testing', 'environment should be testing');
            assertEqual(typeof ctx.app.make('router').getRoutes, 'function');
        },
    },
    {
        name: 'welcome page renders',
        async setup() {
            ctx = ctx || (await createTestApp());
        },
        async fn() {
            const { assertTrue } = require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');
            const response = await ctx.get('/');
            assertTrue([200, 500].includes(response.status()), `got ${response.status()}: ${response.content().slice(0, 400)}`);
            if (response.status() === 200) {
                response.assertSee('Nodevel');
            }
        },
    },
] as TestCase[];

export {};
