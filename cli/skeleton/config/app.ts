'use strict';

/**
 * Application configuration — the equivalent of Laravel's `config/app.php`.
 */

type EnvGetter = (key: string, defaultValue?: any) => any;

module.exports = (env: EnvGetter) => ({
    name: env('APP_NAME', 'Nodevel'),
    env: env('APP_ENV', 'production'),
    debug: Boolean(env('APP_DEBUG', false)),
    url: env('APP_URL', 'http://localhost'),
    timezone: env('APP_TIMEZONE', 'UTC'),
    locale: env('APP_LOCALE', 'en'),
    key: env('APP_KEY'),

    /* ponytail: single fixed port; move to APP_PORT env when deploying behind
       a supervisor that needs it. */
    port: Number(env('APP_PORT', 8000)),
});

export {};
