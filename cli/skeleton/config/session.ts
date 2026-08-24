'use strict';

type EnvGetter = (key: string, defaultValue?: any) => any;

module.exports = (env: EnvGetter) => ({
    driver: env('SESSION_DRIVER', 'file'),
    lifetime: Number(env('SESSION_LIFETIME', 120)),
    cookie: env('SESSION_COOKIE', 'nodevel_session'),
    domain: env('SESSION_DOMAIN'),
    http_only: true,
    same_site: 'lax',
});

export {};
