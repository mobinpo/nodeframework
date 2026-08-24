'use strict';

export {};

/**
 * Database connections and the query builder — the equivalent of
 * `Illuminate\Database` (connection management plus a fluent builder).
 */

const Str = require('../Support/Str');

/** A single row returned by any driver. */
type Row = Record<string, any>;

/** Connection configuration from `config/database.php`. */
interface ConnectionConfig {
    driver: string;
    database?: string;
    host?: string;
    port?: number | string;
    username?: string;
    password?: string;
    [key: string]: any;
}

/** Minimal structural typing for the better-sqlite3 client. */
interface SqliteDatabase {
    pragma(source: string, options?: any): any;
    prepare(sql: string): {
        all(...params: any[]): Row[];
        run(...params: any[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    };
    exec(sql: string): unknown;
}

/** Minimal structural typing for the mysql2/promise pool. */
interface MysqlPool {
    execute(sql: string, values?: any[]): Promise<[any, any]>;
    end(): Promise<void>;
}

/** Minimal structural typing for the pg Pool. */
interface PgPool {
    query(sql: string, values?: any[]): Promise<{ rows?: Row[]; command?: string; rowCount?: number | null }>;
    end(): Promise<void>;
}

type DriverClient =
    | { kind: 'sqlite'; db: SqliteDatabase }
    | { kind: 'mysql'; pool: MysqlPool }
    | { kind: 'pgsql'; pool: PgPool };

/** Laravel-shaped paginator payload (see Builder.paginate). */
interface PaginatorPayload {
    data: any[];
    current_page: number;
    last_page?: number;
    per_page: number;
    total?: number;
    from?: number | null;
    to?: number | null;
    has_more_pages: boolean;
    next_page_url?: number | null;
    prev_page_url?: number | null;
}

class Connection {
    name: string;
    config: ConnectionConfig;
    client: DriverClient | null;
    transactions: number;
    queryLog: { sql: string; bindings: any[]; timeMs: number }[];
    loggingQueries: boolean;

    constructor(name: string, config: ConnectionConfig) {
        this.name = name;
        this.config = config;
        this.client = null;
        this.transactions = 0;
        this.queryLog = [];
        this.loggingQueries = false;
    }

    /** Lazily create the underlying driver client. */
    async connect(): Promise<DriverClient> {
        if (this.client) return this.client;
        switch (this.config.driver) {
            case 'sqlite':
                try {
                    const Database = require('better-sqlite3');
                    const db = new Database(this.config.database);
                    db.pragma('journal_mode = WAL');
                    this.client = { kind: 'sqlite', db };
                } catch {
                    throw new Error(
                        'The sqlite driver requires better-sqlite3. Install via npm install better-sqlite3.'
                    );
                }
                break;
            case 'mysql':
            case 'mariadb': {
                try {
                    const mysql = require('mysql2/promise');
                    const pool = await mysql.createPool({
                        host: this.config.host,
                        port: Number(this.config.port || 3306),
                        user: this.config.username,
                        password: this.config.password,
                        database: this.config.database,
                        waitForConnections: true,
                        connectionLimit: 10,
                    });
                    this.client = { kind: 'mysql', pool };
                } catch (e: any) {
                    if (e.code === 'MODULE_NOT_FOUND') {
                        throw new Error('The mysql driver requires mysql2. Install via npm install mysql2.');
                    }
                    throw e;
                }
                break;
            }
            case 'pgsql':
            case 'postgres': {
                try {
                    const { Pool } = require('pg');
                    const pool = new Pool({
                        host: this.config.host,
                        port: Number(this.config.port || 5432),
                        user: this.config.username,
                        password: this.config.password,
                        database: this.config.database,
                    });
                    this.client = { kind: 'pgsql', pool };
                } catch (e: any) {
                    if (e.code === 'MODULE_NOT_FOUND') {
                        throw new Error('The pgsql driver requires pg. Install via npm install pg.');
                    }
                    throw e;
                }
                break;
            }
            default:
                throw new Error(`Unsupported database driver [${this.config.driver}].`);
        }
        return this.client;
    }

    placeholder(index: number): string {
        switch (this.client?.kind) {
            case 'pgsql':
                return `$${index}`;
            default:
                return '?';
        }
    }

    /**
     * Run a SQL statement with bindings. Returns rows for selects.
     */
    async select(sql: string, bindings: any[] = []): Promise<Row[]> {
        await this.connect();
        const started = Date.now();
        const result = await this.runQuery(sql, bindings);
        if (this.loggingQueries) {
            this.queryLog.push({ sql, bindings, timeMs: Date.now() - started });
        }
        return result;
    }

    async statement(sql: string, bindings: any[] = []): Promise<boolean> {
        await this.select(sql, bindings);
        return true;
    }

    /** List all table names on this connection. */
    async tables(): Promise<string[]> {
        await this.connect();
        const { kind } = this.client!;
        if (kind === 'sqlite') {
            const rows = await this.select(
                `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
            );
            return rows.map((row) => row.name);
        }
        if (kind === 'mysql') {
            const rows = await this.select(`SHOW TABLES`);
            return rows.map((row) => Object.values(row)[0]);
        }
        // pgsql
        const rows = await this.select(
            `SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'`
        );
        return rows.map((row) => row.name);
    }

    async runQuery(sql: string, bindings: any[]): Promise<any> {
        const { kind } = this.client!;
        if (kind === 'sqlite') {
            const trimmed = sql.trim().toUpperCase();
            if (
                trimmed.startsWith('SELECT') ||
                trimmed.startsWith('PRAGMA') ||
                trimmed.startsWith('WITH')
            ) {
                return (this.client as { db: SqliteDatabase }).db.prepare(sql).all(...bindings);
            }
            const info = (this.client as { db: SqliteDatabase }).db.prepare(sql).run(...bindings);
            return [{ changes: info.changes, lastInsertRowid: info.lastInsertRowid }];
        }

        if (kind === 'mysql') {
            const [rows] = await (this.client as { pool: MysqlPool }).pool.execute(sql, bindings);
            return rows;
        }

        // pgsql
        const res = await (this.client as { pool: PgPool }).pool.query(sql, bindings);
        if (res.command === 'SELECT' || res.rows) return res.rows;
        return [{ rowCount: res.rowCount }];
    }

    async insert(sql: string, bindings: any[] = []): Promise<boolean> {
        await this.connect();
        await this.runQuery(sql, bindings);
        return true;
    }

    async insertGetId(sql: string, bindings: any[], idColumn: string = 'id'): Promise<any> {
        await this.connect();
        if (this.client!.kind === 'sqlite') {
            const info = this.client!.db.prepare(sql).run(...bindings);
            return info.lastInsertRowid;
        }
        if (this.client!.kind === 'mysql') {
            const [result] = await this.client!.pool.execute(sql, bindings);
            return result.insertId;
        }
        const sqlReturning = `${sql} RETURNING ${idColumn}`;
        const rows = await this.runQuery(sqlReturning, bindings);
        return rows[0]?.[idColumn];
    }

    async affectingStatement(sql: string, bindings: any[] = []): Promise<number> {
        await this.connect();
        const result = await this.runQuery(sql, bindings);
        if (this.client!.kind === 'sqlite') return result[0]?.changes ?? 0;
        if (this.client!.kind === 'mysql') return result.affectedRows ?? 0;
        return result.rowCount ?? 0;
    }

    async transaction(callback: (connection: Connection) => any): Promise<any> {
        await this.connect();
        await this.statementRaw('BEGIN');
        this.transactions++;
        try {
            const result = await callback(this);
            await this.statementRaw('COMMIT');
            this.transactions--;
            return result;
        } catch (error) {
            this.transactions--;
            await this.statementRaw('ROLLBACK');
            throw error;
        }
    }

    async statementRaw(sql: string): Promise<void> {
        if (this.client!.kind === 'sqlite') this.client!.db.exec(sql);
        else await this.runQuery(sql, []);
    }

    enableQueryLog(): void {
        this.loggingQueries = true;
    }

    disableQueryLog(): void {
        this.loggingQueries = false;
    }

    getQueryLog(): { sql: string; bindings: any[]; timeMs: number }[] {
        return this.queryLog;
    }

    /** Begin building a query against a table. */
    table(table: string): Builder {
        return new Builder(this, table);
    }

    disconnect(): void {
        if (this.client?.kind === 'mysql' && this.client.pool?.end) this.client.pool.end();
        if (this.client?.kind === 'pgsql' && this.client.pool?.end) this.client.pool.end();
        this.client = null;
    }
}

/** A single WHERE clause (shape depends on `type`). */
type WhereClause =
    | { type: 'basic'; column: any; operator: string; boolean: string }
    | { type: 'in'; column: any; count: number; boolean: string; negated: boolean }
    | { type: 'null'; column: any; boolean: string; negated: boolean }
    | { type: 'between'; column: any; boolean: string; negated: boolean }
    | { type: 'columnCompare'; first: any; operator: string; second: any; boolean: string }
    | { type: 'nested'; query: Builder; boolean: string };

/** A JOIN clause. */
interface JoinClause {
    type: 'inner' | 'left';
    table: string;
    first: any;
    operator: string;
    second: any;
}

/**
 * The fluent query builder — a port of `Illuminate\Database\Query\Builder`.
 */
class Builder {
    connection: Connection;
    table_: string;
    wheres: WhereClause[];
    bindings: any[];
    columnsList: string[] | null;
    orderBys: { column: string; direction: string }[];
    limitValue: number | null;
    offsetValue: number | null;
    groupBys: string[];
    havingParts: string[];
    joins: JoinClause[];
    distinctFlag: boolean;

    constructor(connection: Connection, table: string) {
        this.connection = connection;
        this.table_ = table;
        this.wheres = [];
        this.bindings = [];
        this.columnsList = null;
        this.orderBys = [];
        this.limitValue = null;
        this.offsetValue = null;
        this.groupBys = [];
        this.havingParts = [];
        this.joins = [];
        this.distinctFlag = false;
    }

    cloneFor(): Builder {
        const b = new Builder(this.connection, this.table_);
        Object.assign(b, this, {
            wheres: [...this.wheres],
            bindings: [...this.bindings],
            orderBys: [...this.orderBys],
            joins: [...this.joins],
        });
        return b;
    }

    select(...columns: any[]): Builder {
        const b = this.cloneFor();
        b.columnsList = columns.flat().map(String);
        return b;
    }

    addSelect(column: string): Builder {
        const b = this.cloneFor();
        b.columnsList = [...(b.columnsList || ['*']), column];
        return b;
    }

    distinct(): Builder {
        const b = this.cloneFor();
        b.distinctFlag = true;
        return b;
    }

    where(column: any, operatorOrValue: any = null, value: any = null, boolean: string = 'and'): Builder {
        const b = this.cloneFor();

        if (typeof column === 'function') {
            // Nested grouping.
            const nested = new Builder(this.connection, this.table_);
            column(nested);
            b.wheres.push({ type: 'nested', query: nested, boolean });
            b.bindings.push(...nested.bindings);
            return b;
        }

        let operator = '=';
        let expected = operatorOrValue;
        if (value !== null) {
            operator = operatorOrValue;
            expected = value;
        }
        if (expected === null) {
            b.wheres.push({ type: 'null', column, boolean, negated: operator === '=' ? false : true });
            return b;
        }
        b.wheres.push({ type: 'basic', column, operator, boolean });
        b.bindings.push(expected);
        return b;
    }

    orWhere(column: any, operatorOrValue: any = null, value: any = null): Builder {
        return this.where(column, operatorOrValue, value, 'or');
    }

    whereIn(column: any, values: any[], boolean: string = 'and', negated: boolean = false): Builder {
        const b = this.cloneFor();
        b.wheres.push({ type: 'in', column, count: values.length, boolean, negated });
        b.bindings.push(...values);
        return b;
    }

    whereNotIn(column: any, values: any[]): Builder {
        return this.whereIn(column, values, 'and', true);
    }

    orWhereIn(column: any, values: any[]): Builder {
        return this.whereIn(column, values, 'or', false);
    }

    whereNull(column: any): Builder {
        const b = this.cloneFor();
        b.wheres.push({ type: 'null', column, boolean: 'and', negated: false });
        return b;
    }

    whereNotNull(column: any): Builder {
        const b = this.cloneFor();
        b.wheres.push({ type: 'null', column, boolean: 'and', negated: true });
        return b;
    }

    orWhereNull(column: any): Builder {
        const b = this.cloneFor();
        b.wheres.push({ type: 'null', column, boolean: 'or', negated: false });
        return b;
    }

    whereBetween(column: any, [min, max]: any[]): Builder {
        const b = this.cloneFor();
        b.wheres.push({ type: 'between', column, boolean: 'and', negated: false });
        b.bindings.push(min, max);
        return b;
    }

    whereColumn(first: any, operator: any, second: any): Builder {
        const b = this.cloneFor();
        if (second === undefined) {
            second = operator;
            operator = '=';
        }
        b.wheres.push({ type: 'columnCompare', first, operator, second, boolean: 'and' });
        return b;
    }

    join(table: string, first: any, operator: string, second: any): Builder {
        const b = this.cloneFor();
        b.joins.push({ type: 'inner', table, first, operator, second });
        return b;
    }

    leftJoin(table: string, first: any, operator: string, second: any): Builder {
        const b = this.cloneFor();
        b.joins.push({ type: 'left', table, first, operator, second });
        return b;
    }

    orderBy(column: string, direction: string = 'asc'): Builder {
        const b = this.cloneFor();
        b.orderBys.push({ column, direction });
        return b;
    }

    orderByDesc(column: string): Builder {
        return this.orderBy(column, 'desc');
    }

    latest(column: string = 'created_at'): Builder {
        return this.orderByDesc(column);
    }

    oldest(column: string = 'created_at'): Builder {
        return this.orderBy(column);
    }

    inRandomOrder(): Builder {
        return this.orderBy('RANDOM()');
    }

    limit(count: number): Builder {
        const b = this.cloneFor();
        b.limitValue = count;
        return b;
    }

    take(count: number): Builder {
        return this.limit(count);
    }

    offset(count: number): Builder {
        const b = this.cloneFor();
        b.offsetValue = count;
        return b;
    }

    skip(count: number): Builder {
        return this.offset(count);
    }

    groupBy(...columns: string[]): Builder {
        const b = this.cloneFor();
        b.groupBys.push(...columns);
        return b;
    }

    having(sql: string, bindings: any[] = []): Builder {
        const b = this.cloneFor();
        b.havingParts.push(sql);
        b.bindings.push(...bindings);
        return b;
    }

    // -- Compilation ------------------------------------------------------------

    compileSelect(): string {
        const columns = this.columnsList ? this.columnsList.join(', ') : '*';
        let sql = `select ${this.distinctFlag ? 'distinct ' : ''}${columns} from ${wrap(this.table_)}`;

        for (const join of this.joins) {
            sql += ` ${join.type} join ${wrap(join.table)} on ${wrap(join.first)} ${join.operator} ${wrap(join.second)}`;
        }

        sql += this.compileWheres();
        if (this.groupBys.length) sql += ` group by ${this.groupBys.map(wrap).join(', ')}`;
        if (this.havingParts.length) sql += ` having ${this.havingParts.join(' and ')}`;
        for (const order of this.orderBys) {
            sql += ` order by ${order.column.includes('(') ? order.column : wrap(order.column)} ${
                order.direction.toUpperCase()
            }`;
        }
        if (this.limitValue !== null) sql += ` limit ${Number(this.limitValue)}`;
        if (this.offsetValue !== null) sql += ` offset ${Number(this.offsetValue)}`;

        return sql;
    }

    compileWheres(): string {
        if (this.wheres.length === 0) return '';
        const clauses = this.wheres.map((where, index) => {
            const connector = index > 0 ? ` ${where.boolean || 'and'} ` : ' where ';
            switch (where.type) {
                case 'basic':
                    return `${connector}${wrap(where.column)} ${where.operator} ?`;
                case 'in': {
                    const placeholders = Array(where.count).fill('?').join(', ');
                    const not = where.negated ? 'not ' : '';
                    return `${connector}${wrap(where.column)} ${not}in (${placeholders})`;
                }
                case 'null':
                    return `${connector}${wrap(where.column)} is ${where.negated ? 'not ' : ''}null`;
                case 'between': {
                    const not = where.negated ? 'not ' : '';
                    return `${connector}${wrap(where.column)} ${not}between ? and ?`;
                }
                case 'columnCompare':
                    return `${connector}${wrap(where.first)} ${where.operator} ${wrap(where.second)}`;
                case 'nested':
                    return `${connector}(${where.query.compileWheres().replace(/^ where /, '')})`;
                default:
                    throw new Error(`Unsupported where type: ${(where as { type: string }).type}`);
            }
        });
        return clauses.join('');
    }

    // -- Execution -----------------------------------------------------------------

    async get(columns?: any[]): Promise<Row[]> {
        if (columns) return this.select(...columns).get();
        const sql = this.compileSelect();
        return (await this.connection.select(sql, this.bindings)).map((row) => row);
    }

    async first(columns?: any[]): Promise<Row | null> {
        const rows = await this.limit(1).get(columns);
        return rows[0] || null;
    }

    async find(id: any): Promise<Row | null> {
        return this.where('id', id).first();
    }

    async findOrFail(id: any): Promise<Row> {
        const found = await this.find(id);
        if (!found) {
            const error: Error & { status?: number } = new Error(`No query results for model.`);
            error.status = 404;
            throw error;
        }
        return found;
    }

    async value(column: string): Promise<any> {
        const row = await this.first([column]);
        return row ? row[column] : null;
    }

    async exists(): Promise<boolean> {
        const row = await this.limit(1).first(['1 as __exists__']);
        return row !== null;
    }

    async doesntExist(): Promise<boolean> {
        return !(await this.exists());
    }

    async count(column: string = '*'): Promise<number> {
        const b = this.select(`count(${column}) as aggregate`);
        const row = await b.first();
        return Number(row!.aggregate);
    }

    /**
     * Paginate the given query — the equivalent of `paginate()` on Laravel's
     * query builder. Returns `{ data, current_page, last_page, per_page, total,
     * from, to }` shaped like Laravel's paginator JSON.
     */
    async paginate(perPage: number = 15, page: number | string = 1): Promise<PaginatorPayload> {
        const pageNumber = Math.max(1, Number(page) || 1);
        const total = await this.count();
        const lastPage = Math.max(1, Math.ceil(total / perPage));
        const rows = await this.cloneFor()
            .limit(perPage)
            .offset((pageNumber - 1) * perPage)
            .get();

        const from = total === 0 ? null : (pageNumber - 1) * perPage + 1;
        const to = total === 0 ? null : from! + rows.length - 1;

        return {
            data: rows,
            current_page: pageNumber,
            last_page: lastPage,
            per_page: perPage,
            total,
            from,
            to,
            has_more_pages: pageNumber < lastPage,
        };
    }

    /** Pagination without a total count — `simplePaginate()`. */
    async simplePaginate(perPage: number = 15, page: number | string = 1): Promise<PaginatorPayload> {
        const pageNumber = Math.max(1, Number(page) || 1);
        const rows = await this.cloneFor()
            .limit(perPage + 1)
            .offset((pageNumber - 1) * perPage)
            .get();
        const hasMore = rows.length > perPage;
        if (hasMore) rows.pop();

        return {
            data: rows,
            current_page: pageNumber,
            per_page: perPage,
            has_more_pages: hasMore,
            next_page_url: hasMore ? pageNumber + 1 : null,
            prev_page_url: pageNumber > 1 ? pageNumber - 1 : null,
        };
    }

    async max(column: string): Promise<any> {
        const row = await this.select(`max(${wrap(column)}) as aggregate`).first();
        return row?.aggregate ?? null;
    }
    async min(column: string): Promise<any> {
        const row = await this.select(`min(${wrap(column)}) as aggregate`).first();
        return row?.aggregate ?? null;
    }
    async sum(column: string): Promise<number> {
        const row = await this.select(`sum(${wrap(column)}) as aggregate`).first();
        return Number(row?.aggregate ?? 0);
    }
    async avg(column: string): Promise<number> {
        const row = await this.select(`avg(${wrap(column)}) as aggregate`).first();
        return Number(row?.aggregate ?? 0);
    }

    async insert(values: Row | Row[]): Promise<boolean> {
        const rows = Array.isArray(values) ? values : [values];
        if (rows.length === 0) return true;

        const keys = Object.keys(rows[0]);
        const placeholders = rows
            .map(() => `(${keys.map(() => '?').join(', ')})`)
            .join(', ');
        const bindings = rows.flatMap((row) => keys.map((k) => row[k]));

        const sql = `insert into ${wrap(this.table_)} (${keys.map(wrap).join(', ')}) values ${placeholders}`;
        return this.connection.insert(sql, bindings);
    }

    async insertGetId(values: Row, idColumn: string = 'id'): Promise<any> {
        const keys = Object.keys(values);
        const placeholders = keys.map(() => '?').join(', ');
        const bindings = keys.map((k) => values[k]);
        const sql = `insert into ${wrap(this.table_)} (${keys.map(wrap).join(', ')}) values (${placeholders})`;
        return this.connection.insertGetId(sql, bindings, idColumn);
    }

    async update(values: Row): Promise<number> {
        const keys = Object.keys(values);
        const sets = keys.map((k) => `${wrap(k)} = ?`).join(', ');
        const bindings = [...keys.map((k) => values[k]), ...this.bindings];
        const sql = `update ${wrap(this.table_)} set ${sets}${this.compileWheres()}`;
        return this.connection.affectingStatement(sql, bindings);
    }

    async updateOrInsert(attributes: Row, values: Row = {}): Promise<any> {
        if (await this.where(attributes).exists()) {
            return (await this.where(attributes).update(values)) > 0;
        }
        return this.insert({ ...attributes, ...values });
    }

    async increment(column: string, amount: number = 1, extra: Row = {}): Promise<number> {
        const sets = [`${wrap(column)} = ${wrap(column)} + ?`];
        const bindings = [amount];
        for (const [k, v] of Object.entries(extra)) {
            sets.push(`${wrap(k)} = ?`);
            bindings.push(v);
        }
        const sql = `update ${wrap(this.table_)} set ${sets.join(', ')}${this.compileWheres()}`;
        return this.connection.affectingStatement(sql, [...bindings, ...this.bindings]);
    }

    async decrement(column: string, amount: number = 1, extra: Row = {}): Promise<number> {
        const sets = [`${wrap(column)} = ${wrap(column)} - ?`];
        const bindings = [amount];
        for (const [k, v] of Object.entries(extra)) {
            sets.push(`${wrap(k)} = ?`);
            bindings.push(v);
        }
        const sql = `update ${wrap(this.table_)} set ${sets.join(', ')}${this.compileWheres()}`;
        return this.connection.affectingStatement(sql, [...bindings, ...this.bindings]);
    }

    async delete(id: any = null): Promise<number> {
        if (id !== null) return this.where('id', id).delete();
        const sql = `delete from ${wrap(this.table_)}${this.compileWheres()}`;
        return this.connection.affectingStatement(sql, this.bindings);
    }

    async truncate(): Promise<any> {
        if (this.connection.client?.kind === 'sqlite') {
            await this.connection.statementRaw(`DELETE FROM "${this.table_}"`);
            await this.connection.statementRaw(
                `DELETE FROM sqlite_sequence WHERE name = '${this.table_}'`
            ).catch(() => {});
            return true;
        }
        return this.connection.statementRaw(`truncate table ${wrap(this.table_)}`);
    }

    /** Chunk results using keyset pagination — safe while updating. */
    async chunkById(count: number, callback: (rows: Row[]) => any, column: string = 'id'): Promise<boolean> {
        let lastId = 0;
        for (;;) {
            const rows = await this.cloneFor()
                .where(column, '>', lastId)
                .orderBy(column)
                .limit(count)
                .get();
            if (rows.length === 0) return true;
            await callback(rows);
            lastId = Number(rows[rows.length - 1][column]);
            if (rows.length < count) return true;
        }
    }

    async each(callback: (row: Row) => any, count: number = 1000): Promise<boolean> {
        return this.chunkById(count, async (rows) => {
            for (const row of rows) if ((await callback(row)) === false) return false;
            return true;
        });
    }

    async pluck(column: string, keyColumn: string | null = null): Promise<any> {
        const rows = await this.get(keyColumn ? [column, keyColumn] : [column]);
        if (keyColumn) {
            const map: Row = {};
            for (const row of rows) map[row[keyColumn]] = row[column];
            return map;
        }
        return rows.map((row) => row[column]);
    }

    async lists(...args: Parameters<Builder['pluck']>): Promise<any> {
        return this.pluck(...args);
    }
}

/** Quote an identifier per the current driver. */
function wrap(value: any): string {
    if (value === '*') return '*';
    if (value.includes('(') || value.includes(')')) return value; // expression
    void Str;
    return `"${String(value).split('.').join('"."')}"`.replace('"*"', '*');
}

class DatabaseManager {
    app: any;
    connections: Map<string, Connection>;

    constructor(app: any) {
        this.app = app;
        this.connections = new Map();
    }

    connection(name: any = null): Connection {
        name = name || this.app.config('database.default', 'sqlite');
        if (!this.connections.has(name)) {
            const config =
                this.app.config(`database.connections.${name}`) ||
                (() => {
                    throw new Error(`Database connection [${name}] not configured.`);
                })();
            this.connections.set(name, new Connection(name, config));
        }
        return this.connections.get(name)!;
    }

    table(table: string, connectionName: string | null = null): Builder {
        return this.connection(connectionName).table(table);
    }

    async transaction(callback: (connection: Connection) => any, connectionName: string | null = null): Promise<any> {
        return this.connection(connectionName).transaction(callback);
    }

    async select(...args: Parameters<Connection['select']>): Promise<Row[]> {
        return this.connection().select(...args);
    }

    async statement(...args: Parameters<Connection['statement']>): Promise<boolean> {
        return this.connection().statement(...args);
    }

    async insert(...args: Parameters<Connection['insert']>): Promise<boolean> {
        return this.connection().insert(...args);
    }

    async update(...args: Parameters<Connection['affectingStatement']>): Promise<number> {
        return this.connection().affectingStatement(...args);
    }

    async delete(...args: Parameters<Connection['affectingStatement']>): Promise<number> {
        return this.connection().affectingStatement(...args);
    }
}

module.exports = { DatabaseManager, Connection, Builder };
