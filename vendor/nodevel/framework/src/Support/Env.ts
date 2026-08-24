'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Environment variable management — the equivalent of Laravel's DotEnv
 * integration plus the `env()` helper.
 */

export {};

class Env {
    variables: Record<string, any>;
    loaded: boolean;

    constructor() {
        this.variables = {};
        this.loaded = false;
    }

    /**
     * Load a `.env` file into the environment. External process environment
     * variables always take precedence over file values.
     *
     * Reserved values (`true`, `false`, `null`, `empty`, and parenthesised
     * variants) are converted to their native types.
     */
    load(filePath: string): void {
        if (!fs.existsSync(filePath)) return;
        const raw = fs.readFileSync(filePath, 'utf8');

        for (let line of raw.split(/\r?\n/)) {
            line = line.trim();
            if (line === '' || line.startsWith('#')) continue;

            const eq = line.indexOf('=');
            if (eq === -1) continue;

            const key = line.slice(0, eq).trim();
            let value = line.slice(eq + 1).trim();

            // Strip surrounding quotes.
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
                // Expand ${VAR} references inside double quotes.
                value = value.replace(/\$\{(\w+)\}/g, (_m: string, name: string) =>
                    this.get(name, '')
                );
            } else {
                value = this.castValue(value);
                value = String(value).replace(/\$\{(\w+)\}/g, (_m: string, name: string) =>
                    String(this.get(name, ''))
                );
                value = this.castValue(value);
            }

            if (!(key in process.env)) {
                this.variables[key] = value;
            }
        }

        this.loaded = true;
    }

    castValue(value: string): any {
        switch (value) {
            case 'true':
            case '(true)':
                return true;
            case 'false':
            case '(false)':
                return false;
            case 'empty':
            case '(empty)':
                return '';
            case 'null':
            case '(null)':
                return null;
            default:
                return value;
        }
    }

    /** Retrieve an environment variable with an optional default. */
    get(key: string, defaultValue: any = null): any {
        if (key in process.env) {
            const v = process.env[key];
            return typeof v === 'string' ? this.castValue(v) : v;
        }
        if (key in this.variables) return this.variables[key];
        return defaultValue;
    }
}

module.exports = new Env();
