'use strict';

/**
 * The database seeder root — calls every other seeder.
 */
class DatabaseSeeder {
    constructor(app) {
        this.app = app;
    }

    async run() {
        const { User } = require('../../app/Models/User');

        // Idempotent: clear existing users before seeding.
        await User.truncate();

        await User.create({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password',
        });
    }
}

module.exports = { default: DatabaseSeeder, DatabaseSeeder };
