'use strict';

/**
 * Create the personal access tokens table (Sanctum).
 */
module.exports = {
    async up(schema) {
        await schema.create('personal_access_tokens', (table) => {
            table.id();
            table.string('tokenable_type');
            table.foreignId('tokenable_id').index();
            table.string('name');
            table.string('token', 64).unique();
            table.text('abilities').nullable();
            table.timestamp('expires_at').nullable();
            table.timestamps();
        });

        await schema.create('notifications', (table) => {
            table.uuid('id').primary();
            table.string('type');
            table.string('notifiable_type');
            table.foreignId('notifiable_id').index();
            table.text('data');
            table.timestamp('read_at').nullable();
            table.timestamps();
        });
    },

    async down(schema) {
        await schema.dropIfExists('personal_access_tokens');
        await schema.dropIfExists('notifications');
    },
};
