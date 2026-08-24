'use strict';

export {};

/**
 * Start session middleware — boots the per-request session Store and binds it
 * into the container (the equivalent of `Illuminate\Session\Middleware\StartSession`).
 */

type Next = (request: any) => Promise<any>;

interface Middleware {
    handle(request: any, next: Next): Promise<any>;
}

class StartSession implements Middleware {
    async handle(request: any, next: Next): Promise<any> {
        const app = require('../../Foundation/Application').getInstance();

        const manager =
            app.bound('session.manager') && app.make('session.manager').startForRequest
                ? app.make('session.manager')
                : app.make('session');

        const session = manager.startForRequest
            ? manager.startForRequest(request)
            : manager;

        app.instance('session.request', session);
        request.setSession(session);

        const response = await next(request);

        try {
            if (session.save) session.save();
            const cookieHeader = manager.cookieHeader ? manager.cookieHeader(session) : null;
            if (cookieHeader) response.header('set-cookie', cookieHeader);
        } catch {
            /* never break the response on session persistence issues */
        }

        return response;
    }
}

module.exports = { default: StartSession, StartSession };
