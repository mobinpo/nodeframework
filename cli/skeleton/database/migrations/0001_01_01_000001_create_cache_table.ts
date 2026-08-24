'use strict';

/**
 * Create the cache table.
 */

interface SchemaBuilder {
    create(name: string, callback: (table: any) => void): Promise<unknown>;
    dropIfExists(name: string): Promise<unknown>;
}

module.exports = {
    async up(schema: SchemaBuilder): Promise<void> {
        await schema.create('cache', (table) => {
            table.id();
            table.string('key').unique();
            table.text('value');
            table.integer('expiration');
        });
    },

    async down(schema: SchemaBuilder): Promise<void> {
        await schema.dropIfExists('cache');
    },
};

export {};
