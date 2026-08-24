'use strict';

export {};

const crypto = require('crypto');

/**
 * CSRF protection — the equivalent of
 * `Illuminate\Foundation\Http\Middleware\VerifyCsrfToken`.
 *
 * State-changing requests must present the session `_token` value in the
 * `_token` input or the `x-csrf-token` / `x-xsrf-token` headers.
 */

type Next = (request: any) => Promise<any>;

interface Middleware {
    handle(request: any, next: Next): Promise<any>;
}

class VerifyCsrf implements Middleware {
    exceptList: string[];

    constructor() {
        this.exceptList = [];
    }

    /** Register URI patterns (with `*` wildcards) that skip token checks. */
    except(uris: string | string[]): this {
        this.exceptList.push(...(Array.isArray(uris) ? uris : [uris]));
        return this;
    }

    isExcluded(path: string): boolean {
        const target = String(path).replace(/^\/+/, '');
        return this.exceptList.some((pattern) => {
            if (pattern === '*') return true;
            const regex = new RegExp(
                `^${pattern.split('*').map(escapeRegex).join('.*')}$`
            );
            return regex.test(target);
        });
    }

    async handle(request: any, next: Next): Promise<any> {
        const verb = typeof request.method === 'function' ? request.method() : request.method;
        if (!this.stateChanging(verb)) return next(request);
        if (this.isExcluded(reqPath(request))) return next(request);
        if (request.wantsJson() && !request.input('_token')) {
            // JSON API clients authenticate with tokens, not sessions; only
            // enforce CSRF when a session cookie is presented.
            if (!request.cookie(sessionCookieName())) return next(request);
        }

        const app = require('../../Foundation/Application').getInstance();
        const session = app.make('session');
        const token = (session && session.token && session.token()) || '';
        const given =
            request.input('_token') ||
            request.header('x-csrf-token') ||
            strip_(request.header('x-xsrf-token')) ||
            '';

        if (!given || !timingSafeEqual(String(given), String(token))) {
            const error = new Error('CSRF token mismatch.') as Error & { status: number };
            error.status = 419;
            throw error;
        }

        return next(request);
    }

    stateChanging(method: unknown): boolean {
        return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method).toUpperCase());
    }

    /** Blade `@csrf` renders this hidden input. */
    static tokenFrom(request: any): string {
        const app = require('../../Foundation/Application').getInstance();
        const session = app.make('session');
        return (session && session.token && session.token()) || crypto.randomBytes(20).toString('hex');
    }
}

/** Route-only guest middleware — redirect authenticated users away. */
function strip_(value: any): string {
    return value ? decodeURIComponent(String(value)).replace(/^"|"$/g, '') : '';
}

function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

/** Read the request path whether `path` is a property (Nodevel Request) or method. */
function reqPath(request: any): string {
    if (!request) return '/';
    if (typeof request.path === 'function') return request.path();
    return request.path || '/';
}

function sessionCookieName(): string {
    try {
        const app = require('../../Foundation/Application').getInstance();
        return app.config('session.cookie', 'nodevel_session');
    } catch {
        return 'nodevel_session';
    }
}

module.exports = { default: VerifyCsrf, VerifyCsrf };
