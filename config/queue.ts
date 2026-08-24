'use strict';

type EnvGetter = (key: string, defaultValue?: any) => any;

module.exports = (env: EnvGetter) => ({
    default: env('QUEUE_CONNECTION', 'file'),

    connections: {
        sync: { driver: 'sync' },
        file: { driver: 'file' },
        database: { driver: 'database', table: 'jobs' },
    },
});

export {};
