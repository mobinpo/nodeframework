'use strict';

module.exports = (env) => ({
    default: env('DB_CONNECTION', 'sqlite'),

    connections: {
        sqlite: {
            driver: 'sqlite',
            database: env('DB_DATABASE', require('path').join(__dirname, '..', 'database', 'database.sqlite')),
        },

        mysql: {
            driver: 'mysql',
            host: env('DB_HOST', '127.0.0.1'),
            port: env('DB_PORT', '3306'),
            database: env('DB_DATABASE', 'nodevel'),
            username: env('DB_USERNAME', 'root'),
            password: env('DB_PASSWORD', ''),
        },

        mariadb: {
            driver: 'mariadb',
            host: env('DB_HOST', '127.0.0.1'),
            port: env('DB_PORT', '3306'),
            database: env('DB_DATABASE', 'nodevel'),
            username: env('DB_USERNAME', 'root'),
            password: env('DB_PASSWORD', ''),
        },

        pgsql: {
            driver: 'pgsql',
            host: env('DB_HOST', '127.0.0.1'),
            port: env('DB_PORT', '5432'),
            database: env('DB_DATABASE', 'nodevel'),
            username: env('DB_USERNAME', 'root'),
            password: env('DB_PASSWORD', ''),
        },
    },
});
