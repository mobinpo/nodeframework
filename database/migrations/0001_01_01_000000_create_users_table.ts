'use strict';

/**
 * Create the users table.
 */

interface SchemaBuilder {
    create(name: string, callback: (table: any) => void): Promise<unknown>;
    dropIfExists(name: string): Promise<unknown>;
}

module.exports = {
    async up(schema: SchemaBuilder): Promise<void> {
        await schema.create('users', (table) => {
            table.id();
            table.string('name');
            table.string('email').unique();
            table.string('password');
            table.string('remember_token', 100).nullable();
            table.softDeletes();
            table.timestamps();
        });

        await schema.create('password_reset_tokens', (table) => {
            table.string('email').primary();
            table.string('token');
            table.timestamp('created_at').nullable();
        });
    },

    async down(schema: SchemaBuilder): Promise<void> {
        await schema.dropIfExists('password_reset_tokens');
        await schema.dropIfExists('users');
    },
};

export {};
