'use strict';

export {};

const { Blueprint } = require('./Blueprint');

/** Row objects as returned by query results. */
type Row = Record<string, any>;

/** Minimal structural view of a database connection used by the schema builder. */
interface SchemaConnection {
    statement(sql: string, bindings?: any[]): Promise<any>;
    select(sql: string, bindings?: any[]): Promise<Row[]>;
    client?: { kind?: string; db?: { pragma(source: string): any } } | null;
}

/** Structural view of a schema blueprint (see ./Blueprint). */
interface SchemaBlueprint {
    toSql(connection: SchemaConnection, action?: string): string[];
}

/**
 * The schema builder — the equivalent of `Illuminate\Database\Schema\Builder`.
 * Exposed through the `Schema` facade.
 */
class SchemaBuilder {
    connection: SchemaConnection;

    constructor(connection: SchemaConnection) {
        this.connection = connection;
    }

    async create(table: string, callback: (blueprint: SchemaBlueprint) => void): Promise<boolean> {
        const blueprint = new Blueprint(table);
        callback(blueprint);
        for (const sql of blueprint.toSql(this.connection, 'create')) {
            await this.connection.statement(sql);
        }
        return true;
    }

    async table(table: string, callback: (blueprint: SchemaBlueprint) => void): Promise<boolean> {
        const blueprint = new Blueprint(table);
        callback(blueprint);
        for (const sql of blueprint.toSql(this.connection, 'alter')) {
            await this.connection.statement(sql);
        }
        return true;
    }

    async rename(from: string, to: string): Promise<boolean> {
        return this.connection.statement(`ALTER TABLE "${from}" RENAME TO "${to}"`);
    }

    async drop(table: string): Promise<boolean> {
        return this.connection.statement(`DROP TABLE "${table}"`);
    }

    async dropIfExists(table: string): Promise<boolean> {
        return this.connection.statement(`DROP TABLE IF EXISTS "${table}"`);
    }

    async hasTable(table: string): Promise<boolean> {
        const rows = await this.connection.select(
            `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
            [table]
        ).catch(async () => {
            // information_schema fallback for mysql/pgsql.
            return this.connection.select(
                `SELECT table_name AS name FROM information_schema.tables WHERE table_name = ?`,
                [table]
            );
        });
        return rows.length > 0;
    }

    async hasColumn(table: string, column: string): Promise<boolean> {
        const rows = await this.connection.select(`SELECT * FROM "${table}" LIMIT 0`).catch(() => []);
        void column;
        // LIMIT 0 returns no rows; inspect via pragma instead when possible.
        if (this.connection.client?.kind === 'sqlite') {
            const info = await this.connection.select(`PRAGMA table_info("${table}")`);
            return info.some((r) => r.name === column);
        }
        const columns = await this.connection.select(
            `SELECT column_name FROM information_schema.columns WHERE table_name = ?`,
            [table]
        );
        return columns.some((r) => r.column_name === column);
    }

    enableForeignKeyConstraints(): boolean {
        if (this.connection.client?.kind === 'sqlite') {
            this.connection.client!.db!.pragma('foreign_keys = ON');
        }
        return true;
    }

    disableForeignKeyConstraints(): boolean {
        if (this.connection.client?.kind === 'sqlite') {
            this.connection.client!.db!.pragma('foreign_keys = OFF');
        }
        return true;
    }

    async getAllTables(): Promise<string[]> {
        const rows = await this.connection
            .select(`SELECT name FROM sqlite_master WHERE type = 'table'`)
            .catch(() => []);
        return rows.map((r) => r.name);
    }

    /** Drop every table — used by `migrate:fresh`. */
    async dropAllTables(): Promise<boolean> {
        for (const table of await this.getAllTables()) {
            if (table.startsWith('sqlite_')) continue;
            await this.disableForeignKeyConstraints();
            await this.dropIfExists(table);
        }
        return true;
    }
}

module.exports = SchemaBuilder;
