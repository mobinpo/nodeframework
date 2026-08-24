'use strict';

type EnvGetter = (key: string, defaultValue?: any) => any;

module.exports = (env: EnvGetter) => ({
    default: env('CACHE_STORE', 'file'),

    stores: {
        array: { driver: 'array' },
        file: { driver: 'file' },
        redis: { driver: 'redis', connection: {} },
    },
});

export {};
