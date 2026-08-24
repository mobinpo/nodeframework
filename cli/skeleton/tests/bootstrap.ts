'use strict';

const path = require('path');

/**
 * Test bootstrap: boots the application once against an in-memory SQLite
 * database and exposes a shared test context.
 */

process.env.APP_ENV = 'testing';
process.env.DB_CONNECTION = 'sqlite';
process.env.DB_DATABASE = ':memory:';

let sharedAppPromise: Promise<any> | null = null;

async function createTestApp(): Promise<any> {
    // Boot exactly once per test process.
    if (sharedAppPromise) return sharedAppPromise;

    sharedAppPromise = (async () => {
        const testing = require('@nodevel/framework/src/Foundation/Testing/TestCase');
        const app = await testing.bootApp(path.resolve(__dirname, '..'));

        const ctx = new testing.TestCaseContext(app);
        ctx.app = app;
        return ctx;
    })();

    return sharedAppPromise;
}

module.exports = { createTestApp };

export {};
