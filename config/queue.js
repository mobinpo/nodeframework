'use strict';

module.exports = (env) => ({
    default: env('QUEUE_CONNECTION', 'file'),

    connections: {
        sync: { driver: 'sync' },
        file: { driver: 'file' },
        database: { driver: 'database', table: 'jobs' },
    },
});
