'use strict';

module.exports = (env) => ({
    default: env('LOG_CHANNEL', 'stack'),

    channels: {
        stack: ['single'],
        single: { driver: 'single', level: 'debug' },
        daily: { driver: 'daily', days: 14, level: 'debug' },
        stderr: { driver: 'stderr', level: 'debug' },
    },
});
