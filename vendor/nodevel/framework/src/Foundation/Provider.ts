'use strict';

export {};

/**
 * Base service provider — the equivalent of
 * `Illuminate\Support\ServiceProvider`.
 */
class ServiceProvider {
    app: any;

    constructor(app: any) {
        this.app = app;
    }

    /** Register bindings into the container. */
    register(): void {}

    /** Boot services after all providers have registered. */
    boot(): void {}
}

module.exports = ServiceProvider;
