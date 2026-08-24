'use strict';

const path = require('path');

const ServiceProvider = require('@nodevel/framework').ServiceProvider;
const { BroadcastManager: channelRegistry } = require('@nodevel/framework').Broadcasting;

/**
 * The application service provider — register bindings here.
 */
class AppServiceProvider extends ServiceProvider {
    /**
     * Register any application services.
     */
    register(): void {
        //
    }

    /**
     * Bootstrap any application services.
     */
    boot(): void {
        // Rate limiting for API routes (used by the `throttle` middleware).
        this.app.make('ratelimiter').for('api', (request: any) => ({
            max: 60,
            decay: 60,
            key: request.user()?.getKey?.() || request.ip(),
            limiter: 'api',
        }));

        // Private broadcast channels — uncomment when broadcasting is enabled:
        // channelRegistry.channel('orders.{orderId}', (user, orderId) =>
        //     Number(user.getKey()) === Number(orderId)
        // );
        void channelRegistry;

        // Load the HTTP routes (they register through the Route facade).
        require(path.join(this.app.basePath_, 'routes', 'web'));

        // Register route-model bindings here, e.g.:
        // Route.model('user', User);
    }
}

module.exports = AppServiceProvider;

export {};
