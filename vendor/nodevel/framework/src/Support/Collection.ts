'use strict';

const Arr = require('./Arr');

/**
 * A fluent collection wrapper — a port of `Illuminate\Support\Collection`
 * covering the methods applications use most.
 */

export {};

class Collection<T = any> {
    items: T[];

    constructor(items: any = []) {
        this.items = Array.isArray(items) ? [...items] : Object.values(items || {});
    }

    /** PHP-style `count` property — `$collection->count` / `collection.length`. */
    get length(): number {
        return this.items.length;
    }

    static make<U = any>(items: any = []): Collection<U> {
        return new Collection<U>(items);
    }

    static times<U = any>(count: number, callback: (i: number) => U): Collection<U> {
        const items: U[] = [];
        for (let i = 1; i <= count; i++) items.push(callback(i));
        return new Collection<U>(items);
    }

    all(): T[] {
        return this.items;
    }

    [Symbol.iterator](): Iterator<T> {
        return this.items[Symbol.iterator]();
    }

    each(callback: (item: T, index: number) => any): this {
        for (const [index, item] of this.items.entries()) {
            if (callback(item, index) === false) break;
        }
        return this;
    }

    map(callback: (item: T, index: number) => any): Collection<any> {
        return new Collection(this.items.map((item: T, i: number) => callback(item, i)));
    }

    mapSpread(callback: (...args: any[]) => any): Collection<any> {
        return this.map((item: any, key: number) => Array.isArray(item) ? callback(...item, key) : callback(item, key));
    }

    flatMap(callback: (item: T, key: number) => any): Collection<any> {
        return this.map(callback).collapse();
    }

    mapWithKeys(callback: (item: T) => any): Collection<any> {
        const result: Record<string, any> = {};
        for (const item of this.items) {
            const [key, value] = callback(item);
            result[key] = value;
        }
        return new Collection(result);
    }

    filter(callback: ((item: T, index: number) => boolean) | null = null): Collection<T> {
        if (!callback) {
            return new Collection<T>(
                this.items.filter((v) => !(v === null || v === undefined || v === false || v === '' || v === 0))
            );
        }
        return new Collection<T>(this.items.filter((item: T, i: number) => callback(item, i)));
    }

    reject(callback: (item: T, index: number) => boolean): Collection<T> {
        return this.filter((item: T, i: number) => !callback(item, i));
    }

    reduce(callback: (carry: any, item: T) => any, initial: any = null): any {
        let carry = initial;
        for (const item of this.items) carry = callback(carry, item);
        return carry;
    }

    collapse(): Collection<any> {
        const result: any[] = [];
        for (const item of this.items as any[]) {
            if (Array.isArray(item)) result.push(...item);
            else if (item instanceof Collection) result.push(...item.all());
            else if (typeof item?.all === 'function') result.push(...item.all());
            else result.push(item);
        }
        return new Collection(result);
    }

    flatten(depth: number = Infinity): Collection<any> {
        return new Collection(Arr.flatten(this.items as any[], depth));
    }

    pluck(key: string): Collection<any> {
        return new Collection(this.items.map((item: T) => Arr.get(item, key)));
    }

    keyBy(key: string | ((item: T) => any)): Collection<any> {
        const result: Record<string, any> = {};
        for (const item of this.items) {
            result[typeof key === 'function' ? key(item) : Arr.get(item, key)] = item;
        }
        return new Collection(result);
    }

    groupBy(key: string | ((item: T) => any)): Collection<any> {
        const groups: Record<string, any> = {};
        for (const item of this.items) {
            const groupKey = typeof key === 'function' ? key(item) : Arr.get(item, key);
            (groups[groupKey] = groups[groupKey] || []).push(item);
        }
        for (const k of Object.keys(groups)) groups[k] = new Collection(groups[k]);
        return new Collection(Object.values(groups).length ? groups : {});
    }

    sortBy(callback: string | ((item: T) => any)): Collection<T> {
        const fn = typeof callback === 'function' ? callback : (item: T) => Arr.get(item, callback);
        return new Collection<T>([...this.items].sort((a: T, b: T) =>
            String(fn(a)).localeCompare(String(fn(b)), undefined, { numeric: true })
        ));
    }

    sortDesc(callback: string | ((item: T) => any)): Collection<T> {
        return this.sortBy(callback).reverse();
    }

    reverse(): Collection<T> {
        return new Collection<T>([...this.items].reverse());
    }

    values(): Collection<T> {
        return new Collection(Object.values(this.items));
    }

    keys(): Collection<string> {
        return new Collection(Object.keys(this.items));
    }

    first(callback: ((item: T, index: number) => boolean) | null = null, defaultValue: any = null): any {
        return Arr.first(this.items, callback, defaultValue);
    }

    last(callback: ((item: T, index: number) => boolean) | null = null, defaultValue: any = null): any {
        return Arr.last(this.items, callback, defaultValue);
    }

    firstWhere(key: string, value: any): any {
        return this.first((item: T) => Arr.get(item, key) === value);
    }

    where(key: string, ...rest: any[]): Collection<T> {
        let operator = '==';
        let expected;
        if (rest.length >= 2) [operator, expected] = rest;
        else expected = rest[0];

        const ops: Record<string, (a: any, b: any) => boolean> = {
            '===': (a: any, b: any) => a === b,
            '==': (a: any, b: any) => /* loose */ String(a) == String(b),
            '!==': (a: any, b: any) => a !== b,
            '!=': (a: any, b: any) => String(a) != String(b),
            '>': (a: any, b: any) => a > b,
            '<': (a: any, b: any) => a < b,
            '>=': (a: any, b: any) => a >= b,
            '<=': (a: any, b: any) => a <= b,
            in: (a: any, arr: any[]) => arr.includes(a),
        };
        const op = ops[operator];
        if (!op) throw new Error(`Unsupported where operator: ${operator}`);
        return this.filter((item: T) => op(Arr.get(item, key), expected));
    }

    whereIn(key: string, values: any[]): Collection<T> {
        return this.filter((item: T) => values.includes(Arr.get(item, key)));
    }

    whereNotIn(key: string, values: any[]): Collection<T> {
        return this.filter((item: T) => !values.includes(Arr.get(item, key)));
    }

    contains(key: any, value?: any): boolean {
        if (value === undefined) {
            return typeof key === 'function'
                ? this.items.some(key)
                : this.items.includes(key);
        }
        return this.items.some((item: T) => Arr.get(item, key) === value);
    }

    some(key: any, value?: any): boolean {
        // Equivalent to `this.contains(...arguments)` — optional second arg
        // stays `undefined` when omitted, matching the original variadic call.
        return this.contains(key, value);
    }

    every(callback: (item: T, index: number, array: T[]) => boolean): boolean {
        return this.items.every(callback);
    }

    count(): number {
        return this.items.length;
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }

    isNotEmpty(): boolean {
        return this.items.length > 0;
    }

    sum(field: string | ((item: T) => number) | null = null): number {
        const fn = field === null
            ? (i: any) => i
            : typeof field === 'function' ? field : (i: T) => Number(Arr.get(i, field)) || 0;
        return this.reduce((carry: any, item: T) => carry + Number(fn(item) || 0), 0);
    }

    avg(field: string | ((item: T) => number) | null = null): number {
        if (this.isEmpty()) return 0;
        return this.sum(field) / this.count();
    }

    min(field: string | ((item: T) => number) | null = null): number | null {
        const values = this.pluckOrSelf(field);
        return values.length ? Math.min(...values.map(Number)) : null;
    }

    max(field: string | ((item: T) => number) | null = null): number | null {
        const values = this.pluckOrSelf(field);
        return values.length ? Math.max(...values.map(Number)) : null;
    }

    pluckOrSelf(field: string | ((item: T) => any) | null): any[] {
        if (!field) return this.items;
        return this.items.map((item: T) =>
            typeof field === 'function' ? field(item) : Arr.get(item, field)
        );
    }

    unique(key: string | null = null): Collection<T> {
        if (!key) return new Collection<T>([...new Set(this.items)]);
        const seen = new Set();
        return this.filter((item: T) => {
            const v = Arr.get(item, key);
            if (seen.has(v)) return false;
            seen.add(v);
            return true;
        });
    }

    merge(items: any): Collection<T> {
        const other = items instanceof Collection ? items.all() : items;
        return new Collection([...this.items, ...(Array.isArray(other) ? other : Object.values(other))]);
    }

    concat(items: any): Collection<T> {
        return this.merge(items);
    }

    union(items: Record<string, any>): Collection<any> {
        const merged: Record<string, any> = {};
        for (const [k, v] of Object.entries({ ...items, ...Object.fromEntries(this.entries()) })) {
            merged[k] = v;
        }
        return new Collection(merged);
    }

    chunk(size: number): Collection<Collection<T>> {
        const chunks: Collection<T>[] = [];
        for (let i = 0; i < this.items.length; i += size) {
            chunks.push(new Collection<T>(this.items.slice(i, i + size)));
        }
        return new Collection(chunks);
    }

    slice(offset: number, length?: number): Collection<T> {
        return new Collection<T>(this.items.slice(offset, length !== undefined ? offset + length : undefined));
    }

    take(limit: number): Collection<T> {
        return limit >= 0
            ? new Collection<T>(this.items.slice(0, limit))
            : new Collection<T>(this.items.slice(limit));
    }

    skip(count: number): Collection<T> {
        return new Collection<T>(this.items.slice(count));
    }

    tap(callback: (collection: Collection<T>) => void): this {
        callback(this);
        return this;
    }

    when(condition: any, callback: (collection: Collection<T>, condition: any) => void): this {
        if (condition) callback(this, condition);
        return this;
    }

    unless(condition: any, callback: (collection: Collection<T>, condition: any) => void): this {
        if (!condition) callback(this, condition);
        return this;
    }

    toArray(): any[] {
        return this.items.map((item: any) =>
            item && typeof item.toArray === 'function' ? item.toArray() : item
        );
    }

    toJson(options: number = 0): string {
        return JSON.stringify(this.toArray(), null, options);
    }

    entries(): IterableIterator<[number, T]> {
        return this.items.entries();
    }
}

module.exports = Collection;
