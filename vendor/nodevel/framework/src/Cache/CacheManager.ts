'use strict';

const crypto = require('crypto');

export {};

/**
 * Cache stores and the cache manager — the equivalent of
 * `Illuminate\Cache` with `array`, `file`, and (optional) `redis` drivers.
 */

interface CacheEntry {
    value: any;
    expiresAt: number | null;
}

interface CacheStore {
    get(...args: any[]): Promise<any>;
    put(...args: any[]): Promise<boolean>;
    forget(...args: any[]): Promise<boolean>;
    flush(): Promise<boolean>;
    increment(...args: any[]): Promise<number>;
}

class ArrayStore {
    data: Map<string, CacheEntry>;

    constructor() {
        this.data = new Map();
    }

    async get(key: string, defaultValue: any = null): Promise<any> {
        const entry = this.data.get(key);
        if (!entry) return defaultValue;
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.data.delete(key);
            return defaultValue;
        }
        return entry.value;
    }

    async put(key: string, value: any, seconds: number | null = null): Promise<boolean> {
        const expiresAt = seconds ? Date.now() + seconds * 1000 : null;
        this.data.set(key, { value, expiresAt });
        return true;
    }

    async forget(key: string): Promise<boolean> {
        this.data.delete(key);
        return true;
    }

    async flush(): Promise<boolean> {
        this.data.clear();
        return true;
    }

    async increment(key: string, amount: number = 1): Promise<number> {
        const value = Number(await this.get(key, 0)) + amount;
        await this.put(key, value);
        return value;
    }
}

class FileStore {
    directory: string;

    constructor(directory: string) {
        this.directory = directory;
        const fs = require('fs');
        fs.mkdirSync(directory, { recursive: true });
    }

    filePath(key: string): string {
        const hash = crypto.createHash('sha1').update(key).digest('hex');
        return require('path').join(this.directory, `${hash}.json`);
    }

    async get(key: string, defaultValue: any = null): Promise<any> {
        const fs = require('fs');
        try {
            const raw = JSON.parse(fs.readFileSync(this.filePath(key), 'utf8'));
            if (raw.expiresAt && Date.now() > raw.expiresAt) {
                fs.unlinkSync(this.filePath(key));
                return defaultValue;
            }
            return raw.value;
        } catch {
            return defaultValue;
        }
    }

    async put(key: string, value: any, seconds: number | null = null): Promise<boolean> {
        const fs = require('fs');
        fs.writeFileSync(
            this.filePath(key),
            JSON.stringify({ value, expiresAt: seconds ? Date.now() + seconds * 1000 : null })
        );
        return true;
    }

    async forget(key: string): Promise<boolean> {
        const fs = require('fs');
        try {
            fs.unlinkSync(this.filePath(key));
        } catch {}
        return true;
    }

    async flush(): Promise<boolean> {
        const fs = require('fs');
        for (const file of fs.readdirSync(this.directory)) {
            if (file.endsWith('.json')) fs.unlinkSync(require('path').join(this.directory, file));
        }
        return true;
    }

    async increment(key: string, amount: number = 1): Promise<number> {
        const value = Number(await this.get(key, 0)) + amount;
        await this.put(key, value);
        return value;
    }
}

class RedisStore {
    client: any; // an ioredis / node-redis compatible client

    constructor(client: any) {
        this.client = client;
    }

    async get(key: string, defaultValue: any = null): Promise<any> {
        const value = await this.client.get(key);
        return value === null ? defaultValue : JSON.parse(value);
    }

    async put(key: string, value: any, seconds: number | null = null): Promise<boolean> {
        const serialized = JSON.stringify(value);
        if (seconds) await this.client.set(key, serialized, 'EX', seconds);
        else await this.client.set(key, serialized);
        return true;
    }

    async forget(key: string): Promise<boolean> {
        await this.client.del(key);
        return true;
    }

    async flush(): Promise<boolean> {
        await this.client.flushdb();
        return true;
    }

    async increment(key: string, amount: number = 1): Promise<number> {
        return Number(await this.client.incrby(key, amount));
    }
}

class Repository {
    store: CacheStore;

    constructor(store: CacheStore) {
        this.store = store;
    }

    async get(...args: any[]): Promise<any> {
        return this.store.get(...args);
    }
    async put(...args: any[]): Promise<boolean> {
        return this.store.put(...args);
    }
    async remember(key: string, ttlSeconds: number | null, callback: () => any): Promise<any> {
        const existing = await this.get(key);
        if (existing !== null && existing !== undefined) return existing;
        const value = await callback();
        await this.put(key, value, ttlSeconds);
        return value;
    }
    async rememberForever(key: string, callback: () => any): Promise<any> {
        return this.remember(key, null, callback);
    }
    async forget(...args: any[]): Promise<boolean> {
        return this.store.forget(...args);
    }
    async flush(): Promise<boolean> {
        return this.store.flush();
    }
    async increment(...args: any[]): Promise<number> {
        return this.store.increment(...args);
    }
}

class CacheManager {
    app: any;
    stores: Map<string, Repository>;

    constructor(app: any) {
        this.app = app;
        this.stores = new Map();
    }

    store(name: any = null): Repository {
        name = name || this.app.config('cache.default', 'file');
        if (this.stores.has(name)) return this.stores.get(name)!;

        const config = this.app.config(`cache.stores.${name}`, {});
        let store: CacheStore;

        switch (config.driver) {
            case 'array':
                store = new ArrayStore();
                break;
            case 'file':
                store = new FileStore(this.app.storagePath('framework/cache/data'));
                break;
            case 'redis':
                store = new RedisStore(this.createRedisClient(config.connection || {}));
                break;
            default:
                throw new Error(`Unsupported cache driver [${config.driver}].`);
        }

        const repository = new Repository(store);
        this.stores.set(name, repository);
        return repository;
    }

    createRedisClient(connection: Record<string, any>): any {
        // Lazy require so redis is optional.
        try {
            const Redis = require('ioredis');
            return new Redis(connection);
        } catch {
            throw new Error(
                'The Redis cache driver requires the ioredis package. Install it via npm install ioredis.'
            );
        }
    }

    // Convenience pass-throughs to the default store.
    async get(...args: any[]): Promise<any> {
        return this.store().get(...args);
    }
    async put(...args: any[]): Promise<boolean> {
        return this.store().put(...args);
    }
    async remember(...args: any[]): Promise<any> {
        return (this.store().remember as (...a: any[]) => Promise<any>)(...args);
    }
    async forget(...args: any[]): Promise<boolean> {
        return this.store().forget(...args);
    }
    async flush(): Promise<boolean> {
        return this.store().flush();
    }
}

module.exports = { CacheManager, ArrayStore, FileStore, RedisStore };
