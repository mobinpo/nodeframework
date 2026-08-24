'use strict';

/**
 * The Nodevel application bootstrap — the equivalent of Laravel's
 * `bootstrap/app.php`. Receives the application instance and configures
 * routing, middleware, and aliases.
 */

const MaintenanceMode = require('@nodevel/framework/src/Http/Middleware/MaintenanceMode');
const StartSession = require('@nodevel/framework/src/Http/Middleware/StartSession');
const VerifyCsrf = require('@nodevel/framework/src/Http/Middleware/VerifyCsrf');
const Authenticate = require('@nodevel/framework/src/Http/Middleware/Authenticate');

module.exports = function configure(app: any): void {
    // Global middleware run on every request.
    app.withGlobalMiddleware([
        'maintenance',
        'session',
        'csrf',
    ]);

    // Middleware aliases usable on routes: Route.get(...).middleware('auth').
    app.withMiddlewareAliases({
        maintenance: MaintenanceMode,
        session: StartSession,
        csrf: VerifyCsrf,
        auth: Authenticate,
        guest: (console.error('DBG', typeof Authenticate, Object.keys(Authenticate||{})), typeof Authenticate.guestMiddleware === 'function' ? Authenticate.guestMiddleware() : null),
        verified: require('@nodevel/framework/src/Http/Middleware/EnsureEmailIsVerified'),
        throttle: 'throttle', // handled by the router's rate limiter registry
    });

    // CSRF protection exclusions (URI prefixes), e.g. webhooks.
    app.make('middleware.csrf').except(['api/*']);
};

export {};
