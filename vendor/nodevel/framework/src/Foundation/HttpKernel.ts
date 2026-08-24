'use strict';

const Response = require('../Http/Response');
const Request = require('../Http/Request');
const { normalizeResponse } = require('../Routing/Router');

export {};

/**
 * The HTTP kernel — the equivalent of `Illuminate\Foundation\Http\Kernel`.
 * Sends requests through global middleware, dispatches to the router,
 * and converts results into Node server responses.
 */
class HttpKernel {
    app: any;
    sessionManager: any;

    constructor(app: any) {
        this.app = app;
        this.sessionManager = null;
    }

    async handleRequest(nodeReq: any, nodeRes: any): Promise<void> {
        const app = this.app;

        // Maintenance mode is enforced by the `maintenance` global middleware
        // (registered in bootstrap/app.js) so that secret bypass URLs,
        // redirects, and retry/refresh headers work — the same as Laravel's
        // PreventRequestsDuringMaintenance middleware.

        const request = await Request.capture(nodeReq);
        app.instance('request', request);

        // Keep the manager bound under 'session.manager'; 'session' points
        // at the per-request Store.
        this.sessionManager = this.sessionManager || app.make('session');
        app.instance('session.manager', this.sessionManager);

        const session = this.sessionManager.startForRequest(request);
        app.instance('session', session);

        try {
            const response = await this.sendRequestThroughRouter(request);
            session.save();

            // Merge session cookie with any cookies set during the request
            // (e.g. the maintenance-mode bypass cookie).
            if (session.setCookieHeader) {
                const computed = response.getHeaders();
                const existing = computed['set-cookie'];
                const merged = existing
                    ? [].concat(existing, session.setCookieHeader)
                    : session.setCookieHeader;
                response.headers['set-cookie'] = merged;
            }

            response.send(nodeRes);
        } catch (error) {
            this.reportError(error, request);
            renderException(app, error, request, nodeRes, session);
        }
    }

    sendRequestThroughRouter(request: any): any {
        const router = this.app.make('router');
        return router.dispatch(request);
    }

    reportError(error: any, request: any): void {
        void request;
        if (error && (error.status === 404 || error.__missing__)) return;
        this.app.make('log').error(error?.stack || String(error));
    }
}

/** Convert exceptions into HTTP responses. */
function renderException(app: any, error: any, request: any, nodeRes: any, session: any): void {
    const status = error?.status || 500;
    const wantsJson = error instanceof Error ? false : true;

    let body: string;
    const debug = Boolean(app.config('app.debug')) || !app.isProduction();

    if (request.wantsJson() || wantsJson === undefined) {
        body = JSON.stringify(
            {
                message: error?.message || 'Server Error',
                ...(debug && status >= 500 ? { exception: String(error?.stack) } : {}),
            },
            null,
            2
        );
    } else {
        body = `<h1>${status} — ${statusMessage(status)}</h1>`;
        if (debug) body += `<pre>${escape(String(error?.stack))}</pre>`;
    }

    if (status === 422 && session) {
        session.flash('errors', error.errors);
    }

    const headers: Record<string, string> = {};
    if (status === 422) headers['content-type'] = 'application/json';
    else headers['content-type'] =
        request.wantsJson() || typeof body === 'string' && body.startsWith('{')
            ? 'application/json'
            : 'text/html';

    new Response(body, status, headers).send(nodeRes);
}

function statusMessage(status: number): string {
    return (
        {
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            419: 'Page Expired',
            422: 'Unprocessable Entity',
            429: 'Too Many Requests',
            500: 'Server Error',
            503: 'Service Unavailable',
        }[status] || 'Error'
    );
}

function escape(value: unknown): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

module.exports = { HttpKernel };
