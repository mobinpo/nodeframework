'use strict';

const Command = require('../Command') as new (app: any) => any;

export {};

// This file historically relies on the Node `fs` identifier being available
// in scope; declare it type-only so runtime behavior stays untouched.
declare const fs: typeof import('fs');

class DbSeedCommand extends Command {
    static signature = 'db:seed {--class=DatabaseSeeder : The root seeder class name} {--force : Run without confirmation}';
    static description = 'Seed the database with records';

    async handle(): Promise<any> {
        if (!this.app.isProduction() || this.option('force') || (await this.confirm('Run in production?', false))) {
            /* proceed */
        } else {
            this.warn('Operation cancelled.');
            return;
        }

        const seederName = this.option('class') || 'DatabaseSeeder';
        const seederFile = [`${seederName}.ts`, `${seederName}.js`].find((candidate) =>
            fs.existsSync(this.app.databasePath('seeders', candidate)),
        );
        if (!seederFile) {
            this.error(`Seeder [${seederName}] not found.`);
            return 1;
        }
        const file = this.app.databasePath('seeders', seederFile);
        // eslint-disable-next-line import/no-dynamic-require, global-require
        const module = require(file);
        const SeederClass = module.default || Object.values(module)[0];
        await new SeederClass(this.app).run();
        this.info(`Database seeding completed successfully.`);
    }
}

class DbWipeCommand extends Command {
    static signature = 'db:wipe {--database= : The database connection to use} {--force : Run without confirmation}';
    static description = 'Drop all tables, views, and types';

    async handle(): Promise<any> {
        if (!this.app.isProduction() || this.option('force') || (await this.confirm('Run in production?', false))) {
            /* proceed */
        } else {
            this.warn('Operation cancelled.');
            return;
        }

        const connection = this.app.make('db').connection(this.option('database'));
        for (const table of await connection.tables()) {
            connection.statement(`DROP TABLE IF EXISTS "${table}"`);
        }
        this.info(`Dropped all tables successfully.`);
    }
}

class DbShowCommand extends Command {
    static signature = 'db:show {--database= : The database connection to use}';
    static description = 'Display information about the selected database';

    async handle(): Promise<any> {
        const db = this.app.make('db');
        const connection = db.connection(this.option('database'));
        const config = connection.config || {};
        const tables = await connection.tables();

        this.line('');
        this.table(['Attribute', 'Value'], [
            ['Connection', connection.name || (config.connection || 'default')],
            ['Database', config.database || ''],
            ['Driver', config.driver || this.app.config('database.default')],
            ['Tables', String(tables.length)],
        ]);
        return 0;
    }
}

class DbTableCommand extends Command {
    static signature = 'db:table {table : The table name} {--database= : The database connection to use}';
    static description = 'Display information about the given database table';

    async handle(): Promise<any> {
        const connection = this.app.make('db').connection(this.option('database'));
        const table = this.argument('table');
        const columns = await connection.select(
            `PRAGMA table_info("${table.replace(/"/g, '')}")`
        );

        if (!columns.length) {
            // Fall back to information_schema for MySQL / PostgreSQL.
            const rows = await connection.select(
                `SELECT column_name AS name, data_type AS type FROM information_schema.columns WHERE table_name = '${String(table).replace(/'/g, "''")}' ORDER BY ordinal_position`
            );
            columns.push(...rows);
        }

        if (!columns.length) {
            this.warn(`Table [${table}] not found or has no columns.`);
            return 1;
        }

        this.table(
            ['Column', 'Type', 'Not Null', 'Default', 'Primary'],
            columns.map((c) => [
                c.name ?? c.cid,
                c.type ?? '',
                c.notnull ? 'yes' : c.is_nullable === 'YES' ? 'no' : 'no',
                c.dflt_value ?? '',
                c.pk ? 'yes' : '',
            ])
        );
        return 0;
    }
}

module.exports = { DbSeed: DbSeedCommand, DbWipe: DbWipeCommand, DbShow: DbShowCommand, DbTable: DbTableCommand };
