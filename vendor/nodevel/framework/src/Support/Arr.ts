'use strict';

/**
 * Array utilities — a focused port of `Illuminate\Support\Arr`.
 */

export {};

type Dict = Record<string, any>;

class Arr {
    /**
     * Get a value from a nested structure using "dot" notation.
     */
    static get(target: any, key: string | null | undefined, defaultValue: any = null): any {
        if (key === null || key === undefined || key === '') return target;

        if (!(typeof target === 'object' && target !== null)) return defaultValue;

        if (key in target) return target[key];

        const segments = String(key).split('.');
        let current = target;
        for (const segment of segments) {
            if (current === null || current === undefined || !(segment in Object(current))) {
                return defaultValue;
            }
            current = current[segment];
        }
        return current;
    }

    /**
     * Set a value in a nested structure using "dot" notation.
     */
    static set(target: Dict, key: string | string[], value: any): Dict {
        const segments = Array.isArray(key) ? key : String(key).split('.');
        let current = target;
        for (let i = 0; i < segments.length - 1; i++) {
            const segment = segments[i];
            if (!(segment in current) || typeof current[segment] !== 'object') {
                current[segment] = {};
            }
            current = current[segment];
        }
        current[segments[segments.length - 1]] = value;
        return target;
    }

    /** Determine whether any of the given keys exist using dot notation. */
    static has(target: any, key: string | string[]): boolean {
        const keys = Array.isArray(key) ? key : [key];
        return keys.some((k) => {
            let current = target;
            for (const segment of String(k).split('.')) {
                if (current === null || current === undefined || !(segment in Object(current))) {
                    return false;
                }
                current = current[segment];
            }
            return true;
        });
    }

    static only(object: Dict, keys: string[]): Dict {
        const result = {};
        for (const key of keys) {
            if (Arr.has(object, key)) Arr.set(result, key, Arr.get(object, key));
        }
        return result;
    }

    static except(object: Dict, keys: string[]): Dict {
        const result = { ...object };
        for (const key of keys) delete result[key];
        return result;
    }

    static first(array: any[], predicate: ((item: any) => boolean) | null = null, defaultValue: any = null): any {
        if (!predicate) return array.length > 0 ? array[0] : defaultValue;
        for (const item of array) if (predicate(item)) return item;
        return defaultValue;
    }

    static last(array: any[], predicate: ((item: any) => boolean) | null = null, defaultValue: any = null): any {
        if (!predicate) return array.length > 0 ? array[array.length - 1] : defaultValue;
        for (let i = array.length - 1; i >= 0; i--) if (predicate(array[i])) return array[i];
        return defaultValue;
    }

    static where(array: any[], predicate: (item: any) => boolean): any[] {
        return array.filter(predicate);
    }

    static wrap(value: any): any[] {
        if (value === null || value === undefined) return [];
        return Array.isArray(value) ? value : [value];
    }

    static flatten(array: any[], depth: number = Infinity): any[] {
        const result: any[] = [];
        for (const item of array) {
            if (Array.isArray(item) && depth > 0) {
                result.push(...Arr.flatten(item, depth - 1));
            } else {
                result.push(item);
            }
        }
        return result;
    }

    static collapse(array: any[]): any[] {
        return Arr.flatten(array.filter(Array.isArray));
    }

    static unique<T>(array: T[]): T[] {
        return [...new Set(array)];
    }

    static sortRecursive(array: any[]): any[] {
        array.sort();
        return array.map((item) =>
            Array.isArray(item) ? Arr.sortRecursive(item) : item
        );
    }
}

module.exports = Arr;
