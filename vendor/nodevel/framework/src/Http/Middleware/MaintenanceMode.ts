'use strict';

export {};

/**
 * Maintenance mode middleware — the equivalent of
 * `Illuminate\Foundation\Http\Middleware\PreventRequestsDuringMaintenance`.
 *
 * Honors the payload written by `node artisan down`:
 *   { secret, redirect, retry, refresh, template }
 * Requests to `/<secret>` receive a bypass cookie and pass through.
 */

type Next = (request: any) => Promise<any>;

interface Middleware {
    handle(request: any, next: Next): Promise<any>;
}

interface MaintenancePayload {
    secret?: string;
    redirect?: string;
    retry?: number | string;
    refresh?: number | string;
    template?: string;
}

class MaintenanceMode implements Middleware {
    async handle(request: any, next: Next): Promise<any> {
        const app = require('../../Foundation/Application').getInstance();

        if (!app.isDownForMaintenance()) return next(request);

        const fs = require('fs');
        let payload: MaintenancePayload = {};
        try {
            payload = JSON.parse(fs.readFileSync(app.storagePath('framework', 'down'), 'utf8'));
        } catch {
            payload = {};
        }

        const requestPath = reqPath(request);

        const Response = require('../../Http/Response');

        // Secret bypass: visiting /<secret> issues the bypass cookie.
        const cookieName = 'nodevel_maintenance';
        if (payload.secret && !this.bypassed(request, cookieName)) {
            const segments = requestPath.split('/').filter(Boolean);
            if (segments.length === 1 && segments[0] === payload.secret) {
                const response = Response.redirectTo('/', 302);
                response.cookie(cookieName, this.bypassCookieValue(payload.secret), {
                    httpOnly: true,
                    path: '/',
                });
                return response;
            }
        }

        if (this.bypassed(request, cookieName)) return next(request);

        if (payload.redirect) {
            return Response.redirectTo(payload.redirect, 302);
        }

        const headers: Record<string, string> = {};
        if (payload.refresh) headers.refresh = String(payload.refresh);
        if (payload.retry) headers['retry-after'] = String(payload.retry);

        const body = payload.template || 'Service Unavailable';
        return new Response(body, 503, headers);
    }

    bypassed(request: any, cookieName: string): boolean {
        const app = require('../../Foundation/Application').getInstance();
        const secret = (() => {
            try {
                return JSON.parse(
                    require('fs').readFileSync(app.storagePath('framework', 'down'), 'utf8')
                ).secret;
            } catch {
                return null;
            }
        })();
        if (!secret) return false;
        return (
            request.cookie(cookieName) === this.bypassCookieValue(secret)
        );
    }

    bypassCookieValue(secret: string): string {
        return require('crypto')
            .createHmac('sha256', String(secret))
            .update('maintenance-bypass')
            .digest('hex');
    }
}

module.exports = { default: MaintenanceMode, MaintenanceMode };

/** Read the request path whether `path` is a property (Nodevel Request) or method. */
function reqPath(request: any): string {
    if (!request) return '/';
    if (typeof request.path === 'function' && typeof request.path !== 'string') return request.path();
    return request.path || '/';
}
