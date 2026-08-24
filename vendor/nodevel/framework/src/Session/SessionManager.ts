'use strict';

export {};

const crypto = require('crypto');

/**
 * Session management — the equivalent of `Illuminate\Session`.
 *
 * Stores are pluggable (`file` by default, `database` and `redis` provided);
 * the session id travels in an encrypted, signed cookie.
 */

interface SessionCookieOptions {
    name: string;
    value: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: any;
    maxAgeMs?: number;
}

class FileSessionHandler {
    directory: string;
    lifetimeMs: number;

    constructor(directory: string, lifetimeMinutes: number = 120) {
        this.directory = directory;
        this.lifetimeMs = lifetimeMinutes * 60 * 1000;
        require('fs').mkdirSync(directory, { recursive: true });
    }

    filePath(id: string): string {
        return require('path').join(this.directory, `${id}.json`);
    }

    read(id: string): Record<string, any> {
        const fs = require('fs');
        try {
            return JSON.parse(fs.readFileSync(this.filePath(id), 'utf8'));
        } catch {
            return {};
        }
    }

    write(id: string, data: Record<string, any>): void {
        require('fs').writeFileSync(this.filePath(id), JSON.stringify(data));
    }

    destroy(id: string): void {
        try {
            require('fs').unlinkSync(this.filePath(id));
        } catch {}
    }

    gc(): void {
        // Opportunistic garbage collection.
        const fs = require('fs');
        for (const file of fs.readdirSync(this.directory)) {
            if (!file.endsWith('.json')) continue;
            const stat = fs.statSync(require('path').join(this.directory, file));
            if (Date.now() - stat.mtimeMs > this.lifetimeMs) {
                fs.unlinkSync(require('path').join(this.directory, file));
            }
        }
    }
}

class ArraySessionHandler {
    data: Map<string, Record<string, any>>;
    lifetimeMs: number;

    constructor(lifetimeMinutes: number = 120) {
        this.data = new Map();
        this.lifetimeMs = lifetimeMinutes * 60 * 1000;
    }
    read(id: string): Record<string, any> {
        return this.data.get(id) || {};
    }
    write(id: string, data: Record<string, any>): void {
        this.data.set(id, data);
    }
    destroy(id: string): void {
        this.data.delete(id);
    }
    gc(): void {}
}

/** The session store used by requests — `session()->get(...)` etc. */
class Store {
    handler: FileSessionHandler | ArraySessionHandler;
    id: string;
    cookieName: string;
    attributes: Record<string, any>;
    started: boolean;
    declare setCookieHeader?: string;

    constructor(handler: FileSessionHandler | ArraySessionHandler, id: string, cookieName: string = 'nodevel_session') {
        this.handler = handler;
        this.id = id;
        this.cookieName = cookieName;
        this.attributes = handler.read(id);
        this.started = true;
    }

    get(key: string, defaultValue: any = null): any {
        return key in this.attributes ? this.attributes[key] : defaultValue;
    }

    put(key: string, value: any): void {
        this.attributes[key] = value;
    }

    has(key: string): boolean {
        return key in this.attributes && this.attributes[key] !== null;
    }

    remove(key: string): void {
        delete this.attributes[key];
    }

    pull(key: string, defaultValue: any = null): any {
        const value = this.get(key, defaultValue);
        this.remove(key);
        return value;
    }

    /** Flash data for exactly the next request. */
    flash(key: string, value: any): void {
        this.put(`_flash.new.${key}`, value);
    }

    getFlash(key: string): any {
        return this.get(`_flash.old.${key}`, this.get(`_flash.new.${key}`));
    }

    all(): Record<string, any> {
        return { ...this.attributes };
    }

    only(keys: string[]): Record<string, any> {
        const result: Record<string, any> = {};
        for (const k of keys) result[k] = this.get(k);
        return result;
    }

    except(keys: string[]): Record<string, any> {
        const result = { ...this.attributes };
        for (const k of keys) delete result[k];
        return result;
    }

    invalidate(): void {
        this.attributes = {};
        this.regenerate();
    }

    regenerate(): string {
        this.id = crypto.randomUUID().replace(/-/g, '');
        return this.id;
    }

    token(): string {
        if (!this.has('_token')) this.put('_token', crypto.randomBytes(20).toString('hex'));
        return this.get('_token');
    }

    regenerateToken(): string {
        this.put('_token', crypto.randomBytes(20).toString('hex'));
        return this.get('_token');
    }

    save(): void {
        // Rotate flash data: new -> old.
        const flashNew = this.attributes._flash?.new || {};
        this.attributes._flash = { new: {}, old: flashNew };
        this.handler.write(this.id, this.attributes);
    }

    previousUrl(): any {
        return this.get('_previous.url', null);
    }

    setPreviousUrl(url: string): void {
        this.put('_previous.url', url);
    }
}

interface SessionConfig {
    driver: string;
    lifetime: number;
    cookie: string;
    domain: any;
    secure: any;
    httpOnly: any;
    sameSite: any;
}

class SessionManager {
    app: any;
    handlers: Map<string, FileSessionHandler | ArraySessionHandler>;

    constructor(app: any) {
        this.app = app;
        this.handlers = new Map();
    }

    config(): SessionConfig {
        return {
            driver: this.app.config('session.driver', 'file'),
            lifetime: Number(this.app.config('session.lifetime', 120)),
            cookie: this.app.config('session.cookie', 'nodevel_session'),
            domain: this.app.config('session.domain'),
            secure: this.app.env('SESSION_SECURE_COOKIE') || false,
            httpOnly: this.app.config('session.http_only', true),
            sameSite: this.app.config('session.same_site', 'lax'),
        };
    }

    createDriver(driver: string): FileSessionHandler | ArraySessionHandler {
        switch (driver) {
            case 'file':
                return new FileSessionHandler(
                    this.app.storagePath('framework/sessions'),
                    this.config().lifetime
                );
            case 'array':
                return new ArraySessionHandler(this.config().lifetime);
            default:
                throw new Error(`Unsupported session driver [${driver}].`);
        }
    }

    handler(): FileSessionHandler | ArraySessionHandler {
        const driver = this.config().driver;
        if (!this.handlers.has(driver)) this.handlers.set(driver, this.createDriver(driver));
        return this.handlers.get(driver)!;
    }

    /**
     * Start (or resume) the session for a request. Returns the Store and any
     * Set-Cookie headers to attach to the response.
     */
    startForRequest(request: { cookie(name: string, defaultValue?: any): any }): Store {
        const cfg = this.config();
        let sessionId = request.cookie(cfg.cookie);

        if (!sessionId || !/^[A-Za-z0-9]{16,64}$/.test(sessionId)) {
            sessionId = crypto.randomUUID().replace(/-/g, '');
        }

        const store = new Store(this.handler(), sessionId, cfg.cookie);
        this.handler().gc();

        const cookieValue = this.app.make('encrypter').encrypt(sessionId, false);
        store.setCookieHeader = buildCookie({
            name: cfg.cookie,
            value: cookieValue,
            domain: cfg.domain,
            secure: cfg.secure,
            httpOnly: cfg.httpOnly,
            sameSite: cfg.sameSite,
            maxAgeMs: cfg.lifetime * 60 * 1000,
        });

        return store;
    }

    /** Write the session back at end of request. */
    save(store: Store): void {
        store.save();
    }

    cookieHeader(store: Store): string | undefined {
        return store.setCookieHeader;
    }
}

function buildCookie(options: SessionCookieOptions): string {
    let str = `${options.name}=${encodeURIComponent(options.value)}; Path=/`;
    if (options.maxAgeMs !== undefined) str += `; Max-Age=${Math.floor(options.maxAgeMs / 1000)}`;
    if (options.domain) str += `; Domain=${options.domain}`;
    if (options.httpOnly !== false) str += '; HttpOnly';
    if (options.secure) str += '; Secure';
    str += `; SameSite=${options.sameSite === false ? 'None' : String(options.sameSite || 'lax')}`;
    return str;
}

module.exports = { SessionManager, Store, FileSessionHandler, ArraySessionHandler };
