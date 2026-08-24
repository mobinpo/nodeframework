'use strict';

module.exports = (env) => ({
    default: env('CACHE_STORE', 'file'),

    stores: {
        array: { driver: 'array' },
        file: { driver: 'file' },
        redis: { driver: 'redis', connection: {} },
    },
});
