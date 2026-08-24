'use strict';

type EnvGetter = (key: string, defaultValue?: any) => any;

module.exports = (env: EnvGetter) => ({
    default: {
        guard: 'web',
    },
});

export {};
