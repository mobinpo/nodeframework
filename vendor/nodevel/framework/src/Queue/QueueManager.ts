'use strict';

const fs = require('fs');
const path = require('path');

export {};

/**
 * Queues — the equivalent of `Illuminate\Queue` with `sync`, `database`,
 * and (optional) `redis` drivers.
 */

interface QueueJobRow {
    id: any;
    queue?: string;
    payload: string | null;
    attempts?: number;
    [key: string]: any;
}

class SyncQueue {
    app: any;

    constructor(app: any) {
        this.app = app;
    }

    async push(job: any, data: any = {}): Promise<boolean> {
        await runJob(this.app, job, data);
        return true;
    }
}

class DatabaseQueue {
    app: any;
    table: string;

    constructor(app: any) {
        this.app = app;
        this.table = app.config('queue.connections.database.table', 'jobs');
    }

    get db(): any {
        return this.app.make('db').connection(
            this.app.config('queue.connections.database.connection')
        );
    }

    async ensureTable(): Promise<void> {
        await this.db.statement(`CREATE TABLE IF NOT EXISTS "${this.table}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            queue VARCHAR(255) NOT NULL DEFAULT 'default',
            payload TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            reserved_at DATETIME NULL,
            available_at DATETIME NOT NULL
        )`);
    }

    async push(job: any, data: any = {}, queue: string = 'default', delaySeconds: number = 0): Promise<boolean> {
        await this.ensureTable();
        await this.db.table(this.table).insert({
            queue,
            payload: JSON.stringify({ job: jobName(job), data }),
            attempts: 0,
            reserved_at: null,
            available_at: format(new Date(Date.now() + delaySeconds * 1000)),
        });
        return true;
    }

    /** Push an already-serialized payload (used by `queue:retry`). */
    async pushRaw(payload: string, queue: string = 'default', delaySeconds: number = 0): Promise<boolean> {
        await this.ensureTable();
        await this.db.table(this.table).insert({
            queue,
            payload,
            attempts: 0,
            reserved_at: null,
            available_at: format(new Date(Date.now() + delaySeconds * 1000)),
        });
        return true;
    }

    async pop(queue: string = 'default'): Promise<QueueJobRow | null> {
        const rows = await this.db
            .table(this.table)
            .where('queue', queue)
            .where('available_at', '<=', format(new Date()))
            .orderBy('id')
            .limit(1)
            .get();

        const row = rows[0];
        if (!row) return null;

        await this.db
            .table(this.table)
            .where('id', row.id)
            .update({ reserved_at: format(new Date()) });

        return row;
    }

    async deleteJob(row: QueueJobRow): Promise<void> {
        await this.db.table(this.table).where('id', row.id).delete();
    }

    async release(row: QueueJobRow, delaySeconds: number = 0): Promise<void> {
        await this.db.table(this.table).where('id', row.id).update({
            reserved_at: null,
            attempts: Number(row.attempts || 0),
            available_at: format(new Date(Date.now() + delaySeconds * 1000)),
        });
    }

    size(queue: string = 'default'): Promise<number> {
        return this.db.table(this.table).where('queue', queue).count();
    }
}

/** A filesystem-backed queue — useful in tests without a database table. */
class FileQueue {
    directory: string;

    constructor(directory: string) {
        this.directory = directory;
        fs.mkdirSync(directory, { recursive: true });
    }

    filePath(id: any): string {
        return path.join(this.directory, `${String(id).padStart(10, '0')}.job`);
    }

    async push(job: any, data: any = {}, queue: string = 'default', delaySeconds: number = 0): Promise<boolean> {
        const files = fs.readdirSync(this.directory).filter((f) => f.endsWith('.job'));
        const nextId = files.length ? Number(files[files.length - 1].slice(0, -4)) + 1 : 1;
        fs.writeFileSync(
            this.filePath(nextId),
            JSON.stringify({
                queue,
                payload: { job: jobName(job), data },
                availableAt: Date.now() + delaySeconds * 1000,
                attempts: 0,
            })
        );
        return true;
    }

    async pop(queue: string = 'default'): Promise<QueueJobRow | null> {
        const files = fs.readdirSync(this.directory).filter((f) => f.endsWith('.job')).sort();
        for (const file of files) {
            const raw = JSON.parse(fs.readFileSync(path.join(this.directory, file), 'utf8'));
            if (raw.queue !== queue || raw.availableAt > Date.now()) continue;
            return { id: file, payload: JSON.stringify(raw.payload), attempts: raw.attempts || 0 };
        }
        return null;
    }

    async deleteJob(row: QueueJobRow): Promise<void> {
        fs.unlinkSync(path.join(this.directory, row.id));
    }

    async release(row: QueueJobRow, delaySeconds: number = 0): Promise<void> {
        const filePath = path.join(this.directory, row.id);
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        raw.attempts = Number(row.attempts || 0);
        raw.availableAt = Date.now() + delaySeconds * 1000;
        fs.writeFileSync(filePath, JSON.stringify(raw));
    }

    async size(queue: string = 'default'): Promise<number> {
        const files = fs.readdirSync(this.directory).filter((f) => f.endsWith('.job'));
        let total = 0;
        for (const file of files) {
            const raw = JSON.parse(fs.readFileSync(path.join(this.directory, file), 'utf8'));
            if (!queue || raw.queue === queue) total++;
        }
        return total;
    }
}

function jobName(job: any): string {
    if (typeof job === 'string') return job;
    return `${job.constructor.name}`;
}

async function runJob(app: any, job: any, data: any): Promise<void> {
    const handler =
        typeof job === 'string'
            ? resolveJobClass(app, job)
            : job;

    if (!handler) throw new Error(`Job handler not found: ${jobName(job)}`);

    if (typeof handler.handle === 'function') {
        // Class instance or namespace with handle().
        const instance =
            typeof handler === 'function'
                ? new handler(data)
                : Object.assign(Object.create(Object.getPrototypeOf(handler)), handler, { data });
        await instance.handle(...(instance.injectArgs || []));
        return;
    }

    if (typeof handler === 'function') {
        await handler(data);
    }
}

function resolveJobClass(app: any, name: string): any {
    try {
        return require(path.join(app.appPath('Jobs'), name));
    } catch {
        return null;
    }
}

function format(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

class QueueManager {
    app: any;
    drivers: Map<string, any>;

    constructor(app: any) {
        this.app = app;
        this.drivers = new Map();
    }

    connection(name: any = null): any {
        name = name || this.app.config('queue.default', 'database');
        if (this.drivers.has(name)) return this.drivers.get(name);

        const config = this.app.config(`queue.connections.${name}`, {});
        let driver;

        switch (config.driver) {
            case 'sync':
                driver = new SyncQueue(this.app);
                break;
            case 'file':
                driver = new FileQueue(this.app.storagePath('framework/queue'));
                break;
            case 'database':
            case null:
            case undefined:
                driver = new DatabaseQueue(this.app);
                break;
            default:
                throw new Error(`Unsupported queue driver [${config.driver}].`);
        }

        this.drivers.set(name, driver);
        return driver;
    }

    async push(...args: any[]): Promise<any> {
        return this.connection().push(...args);
    }

    async later(delaySeconds: number, job: any, data: any = {}): Promise<any> {
        return this.connection().push(job, data, 'default', delaySeconds);
    }
}

module.exports = { QueueManager, SyncQueue, DatabaseQueue, FileQueue };
