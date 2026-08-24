'use strict';

export {};

/**
 * The HTTP request — a port of `Illuminate\Http\Request` wrapping Node's
 * `IncomingMessage`.
 */

const { URL } = require('url');
const querystring = require('querystring');

class Request {
    node: import('node:http').IncomingMessage;
    queryString: URLSearchParams;
    bodyText: string;
    bodyParsed: any;
    attributes: Map<string, any>;
    user_: any;
    routeParameters: Record<string, any>;
    json_: any;
    declare sessionStore?: any;

    constructor(nodeReq: import('node:http').IncomingMessage, bodyText: string = '') {
        this.node = nodeReq;

        const parsed = new URL(nodeReq.url, `http://${nodeReq.headers.host || 'localhost'}`);
        (this as any).path = decodeURIComponent(parsed.pathname);
        this.queryString = parsed.searchParams;

        (this as any).method = (nodeReq.method || 'GET').toUpperCase();

        // Form method spoofing, mirroring Laravel.
        if ((this as any).method === 'POST' && this._input('_method')) {
            const spoofed = String(this._input('_method')).toUpperCase();
            if (['PUT', 'PATCH', 'DELETE'].includes(spoofed)) (this as any).method = spoofed;
        }

        this.bodyText = bodyText;
        this.bodyParsed = null;
        this.attributes = new Map();
        this.user_ = null;
        this.routeParameters = {};
        this.json_ = null;
    }

    /** Create a request from a Node IncomingMessage. */
    static capture(nodeReq: import('node:http').IncomingMessage): Promise<Request> {
        return new Promise((resolvePromise) => {
            const chunks: Buffer[] = [];
            nodeReq.on('data', (chunk: Buffer) => chunks.push(chunk));
            nodeReq.on('end', () => {
                resolvePromise(new Request(nodeReq, Buffer.concat(chunks).toString('utf8')));
            });
            nodeReq.on('error', () => resolvePromise(new Request(nodeReq, '')));
        });
    }

    _parseBody(): Record<string, any> {
        if (this.bodyParsed === null) {
            const contentType = this.header('content-type', '');
            if (contentType.includes('application/json')) {
                try {
                    this.bodyParsed = JSON.parse(this.bodyText || '{}');
                } catch {
                    this.bodyParsed = {};
                }
            } else if (
                contentType.includes('application/x-www-form-urlencoded') ||
                contentType.includes('multipart/form-data')
            ) {
                this.bodyParsed = querystring.parse(this.bodyText);
            } else {
                this.bodyParsed = {};
            }
        }
        return this.bodyParsed;
    }

    _input(key: string): any {
        const value = this.queryString.get(key);
        if (value !== null && value !== undefined) return value;
        const body = this._parseBody();
        return key in Object(body) ? body[key] : undefined;
    }

    // -- Accessors -----------------------------------------------------------

    fullUrl(): string {
        return `${this.scheme()}://${this.host()}${this.url()}`;
    }
    url() {
        return this.node.url;
    }
    path(): string {
        return (this as any).path;
    }
    root(): string {
        return `${this.scheme()}://${this.host()}`;
    }
    host(): string {
        return this.node.headers.host || 'localhost';
    }
    scheme(): string {
        return (this.node.socket as any)?.encrypted ? 'https' : 'http';
    }
    method(): string {
        return (this as any).method;
    }
    isMethod(method: string): boolean {
        return (this as any).method.toUpperCase() === String(method).toUpperCase();
    }

    header(name: string, defaultValue: any = null): any {
        const value = this.node.headers[String(name).toLowerCase()];
        return value === undefined ? defaultValue : Array.isArray(value) ? value[0] : value;
    }

    hasHeader(name: string): boolean {
        return this.header(name) !== null;
    }

    ip(): string {
        const forwarded = this.header('x-forwarded-for');
        if (forwarded) return String(forwarded).split(',')[0].trim();
        return this.node.socket?.remoteAddress || '127.0.0.1';
    }

    query(key: string | null = null, defaultValue: any = null): any {
        if (key === null) return Object.fromEntries(this.queryString);
        return this.queryString.get(key) ?? defaultValue;
    }

    post(key: string | null = null, defaultValue: any = null): any {
        const body = this._parseBody();
        if (key === null) return body;
        return key in Object(body) ? body[key] : defaultValue;
    }

    input(key: string | null = null, defaultValue: any = null): any {
        if (key === null) return { ...Object.fromEntries(this.queryString), ...this.post() };
        const v = this._input(key);
        return v === undefined ? defaultValue : v;
    }

    all(): Record<string, any> {
        return this.input();
    }

    only(keys: string[]): Record<string, any> {
        const result: Record<string, any> = {};
        for (const key of keys) {
            const v = this.input(key);
            if (v !== null && v !== undefined) result[key] = v;
        }
        return result;
    }

    except(keys: string[]): Record<string, any> {
        const result = this.all();
        for (const key of keys) delete result[key];
        return result;
    }

    has(...keys: string[]): boolean {
        return keys.every((key) => {
            const v = this.input(key);
            return v !== null && v !== undefined && v !== '';
        });
    }

    boolean(key: string): boolean {
        const v = this.input(key);
        if (typeof v === 'boolean') return v;
        if (v === 'true' || v === '1' || v === 1) return true;
        if (v === 'false' || v === '0' || v === 0) return false;
        return false;
    }

    integer(key: string): number {
        return parseInt(String(this.input(key, 0)), 10) || 0;
    }

    str(key: string, defaultValue: string = ''): string {
        const v = this.input(key);
        return v === null || v === undefined ? defaultValue : String(v);
    }

    json(key: string | null = null, defaultValue: any = null): any {
        try {
            const parsed = JSON.parse(this.bodyText || 'null');
            if (parsed === null) return defaultValue;
            if (key === null) return parsed;
            return key.split('.').reduce((acc: any, part: string) => (acc ? acc[part] : undefined), parsed) ?? defaultValue;
        } catch {
            return defaultValue;
        }
    }

    wantsJson(): boolean {
        const accept = this.header('accept') || '';
        return accept.includes('application/json') || accept.includes('+json');
    }

    expectsJson(): boolean {
        return this.wantsJson();
    }

    ajax(): boolean {
        return (this.header('x-requested-with') || '').toLowerCase() === 'xmlhttprequest';
    }

    secure(): boolean {
        return this.scheme() === 'https';
    }

    cookie(name: string, defaultValue: any = null): any {
        const header = this.header('cookie');
        if (!header) return defaultValue;
        for (const pair of String(header).split(';')) {
            const [key, ...rest] = pair.trim().split('=');
            if (key === name) return decodeURIComponent(rest.join('='));
        }
        return defaultValue;
    }

    bearerToken(): string | null {
        const authorization = this.header('authorization') || '';
        if (!authorization.toLowerCase().startsWith('bearer ')) return null;
        return authorization.slice(7).trim() || null;
    }

    // -- Route / attribute plumbing ---------------------------------------------

    setRoute(route: { parameters?: Record<string, any> } | null): void {
        (this as any).route = route;
        this.routeParameters = route?.parameters || {};
    }

    route(param: string | null = null, defaultValue: any = null): any {
        if (param === null) return this.routeParameters;
        return this.routeParameters[param] ?? defaultValue;
    }

    attribute(name: string, value?: any): any {
        if (value === undefined) return this.attributes.get(name);
        this.attributes.set(name, value);
        return value;
    }

    setUser(user: any): void {
        this.user_ = user;
    }

    user(): any {
        return this.user_;
    }

    /** Attach the per-request session store. */
    setSession(session: any): void {
        this.sessionStore = session;
    }

    /** The per-request session store (when session middleware has run). */
    session(): any {
        return this.sessionStore || null;
    }

    mergeIntoAttributes(data: Record<string, any>): void {
        for (const [k, v] of Object.entries(data)) this.attribute(k, v);
    }
}

module.exports = Request;
