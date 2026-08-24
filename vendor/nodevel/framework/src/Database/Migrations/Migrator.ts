'use strict';

export {};

const fs = require('fs');
const path = require('path');

/** A single row returned by query results. */
type Row = Record<string, any>;

/** Minimal structural view of a connection as used by migrations. */
interface MigrationConnection {
    statement(sql: string, bindings?: any[]): Promise<any>;
    select(sql: string, bindings?: any[]): Promise<Row[]>;
    insert(sql: string, bindings?: any[]): Promise<any>;
    disconnect(): void;
}

/** Options for run/rollback/fresh. */
interface MigrateOptions {
    database?: string | null;
    pretend?: boolean;
    step?: number;
    batch?: number;
}

/**
 * The migrator — the equivalent of `Illuminate\Database\Migrations\Migrator`.
 *
 * Migration files export `{ up(schema, connection), down(schema, connection) }`
 * and live in `database/migrations` with timestamp-prefixed names.
 */
class Migrator {
    app: any;
    declare ranNames: string[];

    constructor(app: any) {
        this.app = app;
    }

    get repository(): string {
        return 'migrations';
    }

    connection(name: any = null): any {
        return this.app.make('db').connection(name);
    }

    async ensureRepository(connection: MigrationConnection) {
        await connection.statement(
            `CREATE TABLE IF NOT EXISTS "migrations" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "migration" VARCHAR(255) NOT NULL,
                "batch" INTEGER NOT NULL
            )`
        ).catch(() =>
            // Non-sqlite syntax.
            connection.statement(
                `CREATE TABLE IF NOT EXISTS migrations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    migration VARCHAR(255) NOT NULL,
                    batch INT NOT NULL
                )`
            )
        );
    }

    async getRan(connection: MigrationConnection): Promise<string[]> {
        try {
            const rows = await connection.select('SELECT migration FROM migrations ORDER BY id');
            return rows.map((r) => r.migration);
        } catch {
            return [];
        }
    }

    files(): string[] {
        const dir = this.app.databasePath('migrations');
        if (!fs.existsSync(dir)) return [];
        return fs
            .readdirSync(dir)
            .filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
            .sort()
            .map((f) => path.join(dir, f));
    }

    static migrationName(file: string): string {
        return path.basename(file).replace(/\.(ts|js)$/, '');
    }

    pending(): string[] {
        return this.files().filter((file) => !this.ranNames.includes(Migrator.migrationName(file)));
    }

    /** Run all outstanding migrations. Returns the names executed. */
    async run(options: MigrateOptions = {}): Promise<string[]> {
        const connection = this.connection(options.database);
        await this.ensureRepository(connection);
        const ran = new Set(await this.getRan(connection));
        this.ranNames = [...ran];

        let batch = 1;
        try {
            const rows = await connection.select('SELECT MAX(batch) AS max FROM migrations');
            batch = Number(rows[0]?.max || 0) + 1;
        } catch {}

        const executed: string[] = [];
        for (const file of this.files()) {
            const name = Migrator.migrationName(file);
            if (ran.has(name)) continue;

            if (options.pretend) {
                // eslint-disable-next-line no-console
                console.log(`  would run: ${name}`);
                continue;
            }

            const migration = require(file);
            if (migration.shouldRun && !(await migration.shouldRun())) continue;

            const SchemaBuilder = require('../Schema/Builder');
            const builder = new SchemaBuilder(connection);

            // eslint-disable-next-line no-console
            console.log(`  migrating  ${name}`);
            await migration.up(builder, connection);
            // eslint-disable-next-line no-console
            console.log(`  migrated   ${name}`);

            await connection.insert('INSERT INTO migrations (migration, batch) VALUES (?, ?)', [
                name,
                batch,
            ]);
            executed.push(name);
        }

        return executed;
    }

    /**
     * Roll back the last batch (default), N steps, or a specific batch.
     */
    async rollback(options: MigrateOptions = {}): Promise<string[]> {
        const connection = this.connection(options.database);
        await this.ensureRepository(connection);

        let rows;
        if (options.batch !== undefined) {
            rows = await connection.select(
                'SELECT migration FROM migrations WHERE batch = ? ORDER BY id DESC',
                [Number(options.batch)]
            );
        } else {
            const step = Number(options.step || 1);
            rows = await connection.select(
                `SELECT migration FROM migrations WHERE batch IN (
                    SELECT DISTINCT batch FROM migrations ORDER BY batch DESC LIMIT ?
                ) ORDER BY batch DESC, id DESC`,
                [step]
            );
        }

        if (rows.length === 0) {
            // eslint-disable-next-line no-console
            console.log('Nothing to rollback.');
            return [];
        }

        const SchemaBuilder = require('../Schema/Builder');
        const rolledBack: string[] = [];

        for (const row of rows) {
            const base = path.join(this.app.databasePath('migrations'), row.migration);
            const file = [base + '.ts', base + '.js'].find((candidate) => fs.existsSync(candidate));
            if (!file) continue;

            const migration = require(file);
            // eslint-disable-next-line no-console
            console.log(`rolling back: ${row.migration}`);
            await migration.down(new SchemaBuilder(connection), connection);
            // eslint-disable-next-line no-console
            console.log(`rolled back: ${row.migration}`);

            await connection.statement('DELETE FROM migrations WHERE migration = ?', [
                row.migration,
            ]);
            rolledBack.push(row.migration);
        }

        return rolledBack;
    }

    async reset(database: string | null = null): Promise<boolean> {
        while ((await (this.getRan(this.connection(database)))).length > 0) {
            await this.rollback({ database, step: 1 });
            if ((await this.getRan(this.connection(database))).length === 0) break;
        }
        return true;
    }

    async fresh(options: MigrateOptions = {}): Promise<string[]> {
        const connection = this.connection(options.database);
        const SchemaBuilder = require('../Schema/Builder');
        const builder = new SchemaBuilder(connection);
        await builder.dropAllTables();
        await connection.disconnect();
        return this.run(options);
    }

    async status(): Promise<{ name: string; ran: boolean }[]> {
        const connection = this.connection();
        await this.ensureRepository(connection);
        const ran = new Set(await this.getRan(connection));
        return this.files().map((f) => ({
            name: Migrator.migrationName(f),
            ran: ran.has(Migrator.migrationName(f)),
        }));
    }
}

module.exports = Migrator;
