'use strict';

export {};

/**
 * Validation — the equivalent of `Illuminate\Validation`.
 *
 * Rules are expressed with pipe-separated strings or arrays, mirroring
 * Laravel's rule syntax: `'email' => 'required|email|unique:users'`.
 */

type RuleDefinition = string | string[];
type ErrorBag = Record<string, string[]>;

interface PendingCheck {
    attribute: string;
    params: string[];
    value: any;
}

class ValidationException extends Error {
    errors: ErrorBag;
    status: number;
    validator?: Validator;

    constructor(errors: ErrorBag, message: string = 'The given data was invalid.') {
        super(message);
        this.errors = errors;
        this.status = 422;
    }

    static withMessages(messages: ErrorBag): ValidationException {
        return new ValidationException(messages);
    }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class Validator {
    data: Record<string, any>;
    rules: Record<string, string[]>;
    customMessages: Record<string, string>;
    customAttributes: Record<string, string>;
    errorsBag: ErrorBag;
    pendingUnique?: PendingCheck[];
    pendingExists?: PendingCheck[];
    currentRuleName?: string;

    constructor(data: Record<string, any> = {}, rules: Record<string, RuleDefinition> = {}, messages: Record<string, string> = {}, attributes: Record<string, string> = {}) {
        this.data = data;
        this.rules = normalizeRules(rules);
        this.customMessages = messages;
        this.customAttributes = attributes;
        this.errorsBag = {};
    }

    static make(data: Record<string, any>, rules: Record<string, RuleDefinition>, messages: Record<string, string> = {}): Validator {
        return new Validator(data, rules, messages);
    }

    /**
     * Validate and throw on failure (the common controller idiom).
     * Returns only the validated keys.
     */
    static validate(data: Record<string, any>, rules: Record<string, RuleDefinition>, messages: Record<string, string> = {}): Record<string, any> {
        const validator = new Validator(data, rules, messages);
        if (validator.fails()) {
            const error = new ValidationException(validator.errors());
            error.validator = validator;
            throw error;
        }
        return validator.validated();
    }

    fails(): boolean {
        return Object.keys(this.runRules()).length > 0;
    }

    passes(): boolean {
        return !this.fails();
    }

    errors(): ErrorBag {
        this.runRules();
        return this.errorsBag;
    }

    validated(): Record<string, any> {
        const keys = Object.keys(this.rules);
        const result: Record<string, any> = {};
        for (const key of keys) {
            const value = get(this.data, key);
            if (value !== undefined) set(result, key, value);
        }
        return result;
    }

    safe() {
        if (this.fails()) return { invalid: (cb) => cb(this.errors()) };
        const validated = this.validated();
        return { valid: (cb) => cb(validated) };
    }

    runRules(): ErrorBag {
        this.errorsBag = {};

        for (const [attribute, rules] of Object.entries(this.rules)) {
            const value = get(this.data, attribute);
            const isNullable = rules.includes('nullable');

            if ((value === undefined || value === null || value === '') && isNullable) continue;

            for (const rule of rules) {
                const [name, ...params] = parseRule(rule);
                const error = this.applyRule(name, params, attribute, value);
                if (error) {
                    (this.errorsBag[attribute] = this.errorsBag[attribute] || []).push(error);
                }
            }
        }

        return this.errorsBag;
    }

    applyRule(name: string, params: string[], attribute: string, value: any): string | null {
        const display = this.customAttributes[attribute] || humanize(attribute);

        switch (name) {
            case 'required': {
                const empty =
                    value === undefined ||
                    value === null ||
                    value === '' ||
                    (Array.isArray(value) && value.length === 0) ||
                    (typeof value === 'object' && value !== null && Object.keys(value).length === 0);
                return empty ? this.message(attribute, `${display} field is required.`) : null;
            }
            case 'string':
                return typeof value === 'string' ? null : this.message(attribute, `The ${display} must be a string.`);
            case 'integer':
                return Number.isInteger(Number(value)) && String(value).trim() !== ''
                    ? null
                    : this.message(attribute, `The ${display} must be an integer.`);
            case 'numeric':
                return !Number.isNaN(Number(value)) && String(value).trim() !== ''
                    ? null
                    : this.message(attribute, `The ${display} must be a number.`);
            case 'boolean':
                return ['true', 'false', true, false, 1, 0, '1', '0'].includes(value)
                    ? null
                    : this.message(attribute, `The ${display} must be true or false.`);
            case 'array':
                return Array.isArray(value) ? null : this.message(attribute, `The ${display} must be an array.`);
            case 'json':
                try {
                    JSON.parse(value);
                    return null;
                } catch {
                    return this.message(attribute, `The ${display} must be valid JSON.`);
                }
            case 'email':
                return typeof value === 'string' && EMAIL_RE.test(value)
                    ? null
                    : this.message(attribute, `The ${display} must be a valid email address.`);
            case 'url':
                try {
                    new URL(String(value));
                    return null;
                } catch {
                    return this.message(attribute, `The ${display} must be a valid URL.`);
                }
            case 'uuid':
                return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value))
                    ? null
                    : this.message(attribute, `The ${display} must be a valid UUID.`);
            case 'date':
                return !Number.isNaN(new Date(value).getTime())
                    ? null
                    : this.message(attribute, `The ${display} is not a valid date.`);
            case 'min':
                return satisfiesSize(value, (size) => size >= Number(params[0]))
                    ? null
                    : this.message(
                          attribute,
                          `The ${display} must be at least ${params[0]}${isNumericRule(value) ? '' : ' characters'}.`
                      );
            case 'max':
                return satisfiesSize(value, (size) => size <= Number(params[0]))
                    ? null
                    : this.message(
                          attribute,
                          `The ${display} may not be greater than ${params[0]}${isNumericRule(value) ? '' : ' characters'}.`
                      );
            case 'between':
                return satisfiesSize(value, (size) => size >= Number(params[0]) && size <= Number(params[1]))
                    ? null
                    : this.message(attribute, `The ${display} must be between ${params[0]} and ${params[1]}.`);
            case 'size':
                return satisfiesSize(value, (size) => size === Number(params[0]))
                    ? null
                    : this.message(attribute, `The ${display} must be ${params[0]}.`);
            case 'in':
                return params.includes(String(value))
                    ? null
                    : this.message(attribute, `The selected ${display} is invalid.`);
            case 'not_in':
                return !params.includes(String(value))
                    ? null
                    : this.message(attribute, `The selected ${display} is invalid.`);
            case 'distinct':
                return Array.isArray(value) && new Set(value.map((v) => JSON.stringify(v))).size === value.length
                    ? null
                    : this.message(attribute, `The ${display} has duplicate values.`);
            case 'confirmed': {
                const confirmation = this.data[`${attribute}_confirmation`];
                return value === confirmation
                    ? null
                    : this.message(attribute, `The ${display} confirmation does not match.`);
            }
            case 'same':
                return value === this.data[params[0]]
                    ? null
                    : this.message(attribute, `The ${display} and ${humanize(params[0])} must match.`);
            case 'different':
                return value !== this.data[params[0]]
                    ? null
                    : this.message(attribute, `The ${display} and ${humanize(params[0])} must be different.`);
            case 'regex':
                return new RegExp(params.join(':')).test(String(value))
                    ? null
                    : this.message(attribute, `The ${display} format is invalid.`);
            case 'starts_with':
                return params.some((p) => String(value ?? '').startsWith(p))
                    ? null
                    : this.message(attribute, `The ${display} must start with one of: ${params.join(', ')}.`);
            case 'ends_with':
                return params.some((p) => String(value ?? '').endsWith(p))
                    ? null
                    : this.message(attribute, `The ${display} must end with one of: ${params.join(', ')}.`);
            case 'unique': {
                // unique:table,column,ignoreId — synchronous check is not
                // possible; queue for async validation via validateAsync.
                this.pendingUnique = this.pendingUnique || [];
                this.pendingUnique.push({ attribute, params, value });
                return null;
            }
            case 'exists': {
                this.pendingExists = this.pendingExists || [];
                this.pendingExists.push({ attribute, params, value });
                return null;
            }
            default:
                // Unknown rule names are ignored to allow package extensions.
                return null;
        }
    }

    /** Async validation pass handling database-backed rules. */
    async validateAsync(app: any): Promise<ErrorBag> {
        const syncErrors = this.runRules();

        const dbChecks: PendingCheck[] = [...(this.pendingUnique || []), ...(this.pendingExists || [])];
        if (!app || dbChecks.length === 0) return syncErrors;

        const db = app.make('db');
        for (const check of dbChecks) {
            const [table, column = check.attribute, ignoreId] = check.params;

            if (this.pendingUnique?.includes(check)) {
                let query = db.table(table).where(column, check.value);
                if (ignoreId) query = query.where('id', '<>', ignoreId);
                const exists = await query.exists();
                if (exists) {
                    (syncErrors[check.attribute] = syncErrors[check.attribute] || []).push(
                        this.message(check.attribute, `The ${humanize(check.attribute)} has already been taken.`)
                    );
                }
            } else {
                const exists = await db.table(table).where(column, check.value).exists();
                if (!exists) {
                    (syncErrors[check.attribute] = syncErrors[check.attribute] || []).push(
                        this.message(check.attribute, `The selected ${humanize(check.attribute)} is invalid.`)
                    );
                }
            }
        }

        this.errorsBag = syncErrors;
        return syncErrors;
    }

    message(attribute: string, fallback: string): string {
        const key = `${attribute}.${this.currentRuleName}`;
        return this.customMessages[key] || this.customMessages[this.currentRuleName as string] || fallback;
    }
}

// Attach the current rule name so custom messages can key off it.
const originalApply = Validator.prototype.applyRule;
Validator.prototype.applyRule = function patched(this: Validator, name: string, params: string[], attribute: string, value: any) {
    this.currentRuleName = name;
    return originalApply.call(this, name, params, attribute, value);
};

function normalizeRules(rules: Record<string, RuleDefinition>): Record<string, string[]> {
    const normalized: Record<string, string[]> = {};
    for (const [attribute, definition] of Object.entries(rules)) {
        normalized[attribute] = Array.isArray(definition)
            ? definition.map(String)
            : String(definition).split('|').filter(Boolean);
    }
    return normalized;
}

function parseRule(rule: string): string[] {
    return String(rule).split(':');
}

function humanize(attribute: string): string {
    return String(attribute).replace(/_/g, ' ');
}

function isNumericRule(value: any): boolean {
    return !Number.isNaN(Number(value));
}

function satisfiesSize(value: any, predicate: (size: number) => boolean): boolean {
    let size: number;
    if (value === undefined || value === null) size = 0;
    else if (Array.isArray(value)) size = value.length;
    else if (typeof value === 'number') size = Math.abs(value);
    else if (typeof value === 'string' && !Number.isNaN(Number(value))) size = Math.abs(Number(value));
    else size = String(value).length;
    return predicate(size);
}

function get(object: Record<string, any>, path: string): any {
    return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), object);
}

function set(object: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    let current = object;
    for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

module.exports = { Validator, ValidationException };
