'use strict';

const Arr = require('./Arr');

/**
 * Configuration repository — the equivalent of `Illuminate\Config\Repository`.
 * Supports "dot" access, `set`, typed getters, and loading from files.
 */

export {};

class Repository {
    items: Record<string, any>;

    constructor(items: Record<string, any> = {}) {
        this.items = items;
    }

    has(key: string): boolean {
        return Arr.has(this.items, key);
    }

    get(key: string, defaultValue: any = null): any {
        return Arr.get(this.items, key, defaultValue);
    }

    set(key: string | Record<string, any>, value: any = null): Repository {
        if (typeof key === 'object') {
            for (const [k, v] of Object.entries(key)) Arr.set(this.items, k, v);
            return this;
        }
        Arr.set(this.items, key, value);
        return this;
    }

    all(): Record<string, any> {
        return this.items;
    }

    // Typed getters — throw when the stored type does not match.
    string(key: string): string {
        const v = this.get(key);
        if (typeof v !== 'string') throw new TypeError(`Configuration value [${key}] is not a string.`);
        return v;
    }
    integer(key: string): number {
        const v = this.get(key);
        if (!Number.isInteger(v)) throw new TypeError(`Configuration value [${key}] is not an integer.`);
        return v;
    }
    float(key: string): number {
        const v = this.get(key);
        if (typeof v !== 'number') throw new TypeError(`Configuration value [${key}] is not a number.`);
        return v;
    }
    boolean(key: string): boolean {
        const v = this.get(key);
        if (typeof v !== 'boolean') throw new TypeError(`Configuration value [${key}] is not a boolean.`);
        return v;
    }
    array(key: string): any[] {
        const v = this.get(key);
        if (!Array.isArray(v)) throw new TypeError(`Configuration value [${key}] is not an array.`);
        return v;
    }

    /**
     * Load configuration values from every `.js` file in a directory. Each
     * file must export either an object or a function receiving the loaded
     * environment helper.
     */
    static loadFromDirectory(dir: string): Repository {
        const fs = require('fs');
        const path = require('path');
        const items: Record<string, any> = {};

        if (!fs.existsSync(dir)) return new Repository(items);

        const Env = require('./Env');

        for (const file of fs.readdirSync(dir)) {
            if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
            const name = path.basename(file, path.extname(file));
            const module = require(path.join(dir, file));
            items[name] = typeof module === 'function' ? module((key: string, def: any) => Env.get(key, def)) : module;
        }

        return new Repository(items);
    }
}

module.exports = Repository;
