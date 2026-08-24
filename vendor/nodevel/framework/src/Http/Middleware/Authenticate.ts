'use strict';

export {};

/**
 * Authenticate middleware — the equivalent of
 * `Illuminate\Auth\Middleware\Authenticate`. Throws 401 (JSON) or redirects
 * to a login route when unauthenticated.
 */

type Next = (request: any) => Promise<any>;

interface Middleware {
    handle(request: any, next: Next): Promise<any>;
}

class Authenticate implements Middleware {
    static redirectTo(request: any): string {
        return '/login';
    }

    async handle(request: any, next: Next): Promise<any> {
        const app = require('../../Foundation/Application').getInstance();
        const user = await app.make('auth').user();

        if (!user) {
            const Response = require('../../Http/Response');
            if (request.wantsJson() || request.expectsJson()) {
                const error = new Error('Unauthenticated.') as Error & { status: number };
                error.status = 401;
                throw error;
            }
            const target = (this.constructor as typeof Authenticate).redirectTo(request);
            const separator = target.includes('?') ? '&' : '?';
            return Response.redirectTo(
                `${target}${separator}redirect=${encodeURIComponent(reqPath(request))}`,
                302
            );
        }

        return next(request);
    }

    /** The inverse — redirect authenticated users away (login/register pages). */
    static guestMiddleware() {
        const Guest = class {
            async handle(request: any, next: Next): Promise<any> {
                const app = require('../../Foundation/Application').getInstance();
                const user = await app.make('auth').user();
                if (user) return require('../../Http/Response').redirectTo('/dashboard', 302);
                return next(request);
            }
        };
        Object.defineProperty(Guest, 'name', { value: 'RedirectIfAuthenticated' });
        return new Guest();
    }
}


/** Read the request path whether `path` is a property (Nodevel Request) or method. */
function reqPath(request: any): string {
    if (!request) return '/';
    if (typeof request.path === 'function') return request.path();
    return request.path || '/';
}

module.exports = { default: Authenticate, Authenticate };
