'use strict';

type EnvGetter = (key: string, defaultValue?: any) => any;

module.exports = (env: EnvGetter) => ({
    default: env('FILESYSTEM_DISK', 'local'),

    disks: {
        local: {
            driver: 'local',
            root: require('path').join(__dirname, '..', 'storage', 'app'),
        },
        public: {
            driver: 'local',
            root: require('path').join(__dirname, '..', 'storage', 'app', 'public'),
            url: '/storage',
        },
    },
});

export {};
