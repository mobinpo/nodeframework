'use strict';

module.exports = (env) => ({
    default: env('MAIL_MAILER', 'log'),

    mailers: {
        smtp: {
            host: env('MAIL_HOST'),
            port: env('MAIL_PORT', 587),
            username: env('MAIL_USERNAME'),
            password: env('MAIL_PASSWORD'),
        },
        log: {},
    },
});
