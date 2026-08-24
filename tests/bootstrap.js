'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Test bootstrap: boots the application once against an in-memory SQLite
 * database, runs migrations, and exposes the shared context.
 */

process.env.APP_ENV = 'testing';
process.env.DB_CONNECTION = 'sqlite';
process.env.DB_DATABASE = ':memory:';

const { bootApp } = require('../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

let sharedConnection = null;
let sharedAppPromise = null;

async function createTestApp() {
    // Boot + migrate exactly once per test process.
    if (sharedAppPromise) return sharedAppPromise;

    sharedAppPromise = (async () => {
        const app = await bootApp(path.resolve(__dirname, '..'));

    // In-memory sqlite: connect + migrate once.
        sharedConnection = app.make('db').connection();

        // Start from a clean schema each run.
        const SchemaBuilder0 = require('../vendor/nodevel/framework/src/Database/Schema/Builder');
        await new SchemaBuilder0(sharedConnection).dropAllTables();
        const SchemaBuilder = require('../vendor/nodevel/framework/src/Database/Schema/Builder');
        const builder = new SchemaBuilder(sharedConnection);

        const migrationsDir = path.resolve(__dirname, '../database/migrations');
        for (const file of fs.readdirSync(migrationsDir).sort()) {
            if (!file.endsWith('.js')) continue;
            const migration = require(path.join(migrationsDir, file));
            if (migration.up) await migration.up(builder, sharedConnection);
        }

        const TestCaseContext = require('../vendor/nodevel/framework/src/Foundation/Testing/TestCase').TestCaseContext;
        const ctx = new TestCaseContext(app);
        ctx.app = app;
        return ctx;
    })();

    return sharedAppPromise;
}

module.exports = { createTestApp };
