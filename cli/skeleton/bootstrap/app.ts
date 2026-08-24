'use strict';

/**
 * The Nodevel application bootstrap — the equivalent of Laravel's
 * `bootstrap/app.php`. Receives the application instance and configures
 * routing, middleware, and aliases.
 */

const { MaintenanceMode } = require('@nodevel/framework/src/Http/Middleware/MaintenanceMode');
const { StartSession } = require('@nodevel/framework/src/Http/Middleware/StartSession');
const { VerifyCsrf } = require('@nodevel/framework/src/Http/Middleware/VerifyCsrf');
const { Authenticate } = require('@nodevel/framework/src/Http/Middleware/Authenticate');
const { EnsureEmailIsVerified } = require('@nodevel/framework/src/Http/Middleware/EnsureEmailIsVerified');

module.exports = function configure(app: any): void {
    // Global middleware run on every request.
    app.withGlobalMiddleware([
        'maintenance',
        'session',
        'csrf',
    ]);

    // Middleware aliases usable on routes: Route.get(...).middleware('auth').
    const csrf = new VerifyCsrf();
    app.withMiddlewareAliases({
        maintenance: new MaintenanceMode(),
        session: new StartSession(),
        csrf,
        auth: new Authenticate(),
        guest: Authenticate.guestMiddleware(),
        verified: new EnsureEmailIsVerified(),
    });

    // CSRF protection exclusions (URI prefixes), e.g. webhooks.
    csrf.except(['api/*']);
};

export {};
