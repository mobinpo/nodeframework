'use strict';

type EnvGetter = (key: string, defaultValue?: any) => any;

module.exports = (env: EnvGetter) => ({
    default: env('LOG_CHANNEL', 'stack'),

    channels: {
        stack: ['single'],
        single: { driver: 'single', level: 'debug' },
        daily: { driver: 'daily', days: 14, level: 'debug' },
        stderr: { driver: 'stderr', level: 'debug' },
    },
});

export {};
