'use strict';

export {};

const Str = require('../Support/Str');

/**
 * A single route — a port of `Illuminate\Routing\Route`.
 */

type RouteAction = ((request: any, ...params: any[]) => any) | [Function, string] | string;

type RouteMiddleware = string | { handle: (request: any, next: (request: any) => Promise<any>) => Promise<any> };

class Route {
    methods: string[];
    uri: string;
    action: RouteAction;
    middlewareList: RouteMiddleware[];
    name_: string | null;
    whereConstraints: Record<string, string | null>;
    domainPattern: string | null;
    withTrashed_: boolean;
    scopeBindings_: boolean;
    missingHandler: ((...args: any[]) => any) | null;
    declare parameters?: Record<string, any>;
    declare paramNames?: string[];
    declare domainParameters?: Record<string, string>;

    /**
     * @param methods HTTP verbs
     * @param uri URI pattern, e.g. `/users/{user}/posts/{post:slug}`
     * @param action closure or [ControllerClass, 'method']
     */
    constructor(methods: string[], uri: string, action: RouteAction) {
        this.methods = methods.map((m) => m.toUpperCase());
        this.uri = uri.startsWith('/') ? uri : `/${uri}`;
        this.action = action;
        this.middlewareList = [];
        this.name_ = null;
        this.whereConstraints = {};
        this.domainPattern = null;
        this.withTrashed_ = false;
        this.scopeBindings_ = false;
        this.missingHandler = null;
        (this as any).defaults = {};
    }

    // -- Fluent configuration ---------------------------------------------------

    middleware(middleware: RouteMiddleware | RouteMiddleware[]): Route {
        const list = Array.isArray(middleware) ? middleware : [middleware];
        this.middlewareList.push(...list);
        return this;
    }

    name(name: string): Route {
        this.name_ = name;
        return this;
    }

    getName(): string | null {
        return this.name_;
    }

    where(constraintsOrName: string | Record<string, string>, constraint: string | null = null): Route {
        if (typeof constraintsOrName === 'string') {
            this.whereConstraints[constraintsOrName] = constraint;
        } else {
            Object.assign(this.whereConstraints, constraintsOrName);
        }
        return this;
    }

    whereNumber(param: string): Route {
        return this.where(param, '[0-9]+');
    }
    whereAlpha(param: string): Route {
        return this.where(param, '[A-Za-z]+');
    }
    whereAlphaNumeric(param: string): Route {
        return this.where(param, '[A-Za-z0-9]+');
    }
    whereUuid(param: string): Route {
        return this.where(param, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}');
    }
    whereUlid(param: string): Route {
        return this.where(param, '[0-7][0-9ABCDEFGHJKMNPQRSTVWXYZ]{25}');
    }
    whereIn(param: string, values: unknown[]): Route {
        return this.where(param, values.map((v) => escapeRegExp(String(v))).join('|'));
    }

    domain(pattern: string): Route {
        this.domainPattern = pattern;
        return this;
    }

    withTrashed(): Route {
        this.withTrashed_ = true;
        return this;
    }

    scopeBindings(): Route {
        this.scopeBindings_ = true;
        return this;
    }

    withoutScopedBindings(): Route {
        this.scopeBindings_ = false;
        return this;
    }

    missing(handler: (...args: any[]) => any): Route {
        this.missingHandler = handler;
        return this;
    }

    defaults(key: string, value: any): Route {
        (this as any).defaults[key] = value;
        return this;
    }

    // -- Matching -----------------------------------------------------------------

    /** Compile the URI into a RegExp with named parameter groups. */
    toRegex(globalPatterns: Record<string, string> = {}): { regex: RegExp; paramNames: string[] } {
        let regexStr = '^';
        const paramNames: string[] = [];

        for (const segment of this.uri.split('/')) {
            if (!segment) continue;
            if (segment.startsWith('{') && segment.endsWith('}')) {
                let raw = segment.slice(1, -1);
                let optional = false;
                if (raw.endsWith('?')) {
                    optional = true;
                    raw = raw.slice(0, -1);
                }
                const [paramName, customKey] = raw.split(':');
                paramNames.push(paramName);
                const pattern =
                    this.whereConstraints[paramName] ||
                    (customKey ? undefined : globalPatterns[paramName]) ||
                    globalPatterns[paramName] ||
                    '[^/]+';
                regexStr += optional
                    ? `(?:/(?<${paramName}>${pattern || '[^/]+'}))?`
                    : `/(?<${paramName}>${pattern})`;
            } else {
                regexStr += `/${escapeRegExp(segment)}`;
            }
        }

        if (regexStr === '^') regexStr += '/';

        return { regex: new RegExp(`${regexStr}$`), paramNames };
    }

    /**
     * Match a request path. Returns matched parameters or null.
     */
    matches(path: string, globalPatterns: Record<string, string> = {}): Record<string, any> | null {
        const { regex, paramNames } = this.toRegex(globalPatterns);
        const match = regex.exec(path);
        if (!match) return null;

        const parameters: Record<string, any> = {};
        for (const name of paramNames) {
            parameters[name] = match.groups?.[name] ?? (this as any).defaults[name];
        }
        this.parameters = parameters;
        this.paramNames = paramNames;
        return parameters;
    }

    matchesDomain(host: string): boolean {
        if (!this.domainPattern) return true;
        const pattern = escapeRegExp(this.domainPattern).replace(/\\\{(\w+)\\\}/g, (_m: string, name: string) => `(?<__domain_${name}>[^.]+)`);
        const regex = new RegExp(`^${pattern.replace(/^\^/, '').replace(/\$$/, '')}$`, 'i');
        const match = regex.exec(host.split(':')[0]);
        if (!match) return false;
        this.domainParameters = {};
        for (const [key, value] of Object.entries(match.groups || {})) {
            this.domainParameters[key.replace('__domain_', '')] = value;
        }
        return true;
    }

    /** Build a URL from route parameters. */
    buildUrl(parameters: Record<string, any> = {}): string {
        let url = this.uri;
        const unused = { ...parameters };

        url = url.replace(/\{(\w+)(?::\w+)?\??\}/g, (_m: string, name: string) => {
            if (!(name in unused)) return '';
            delete unused[name];
            return encodeURIComponent(String(parameters[name]));
        });

        const query = queryFrom(unused);
        return query ? `${url}?${query}` : url;
    }
}

function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function queryFrom(params: Record<string, any>): string {
    if (params === null || typeof params !== 'object') return '';
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined) continue;
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
    void Str; // referenced to keep import tree consistent
    return parts.join('&');
}

module.exports = Route;
