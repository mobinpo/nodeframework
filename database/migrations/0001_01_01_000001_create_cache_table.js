'use strict';

/**
 * Create the cache table.
 */
module.exports = {
    async up(schema) {
        await schema.create('cache', (table) => {
            table.id();
            table.string('key').unique();
            table.text('value');
            table.integer('expiration');
        });
    },

    async down(schema) {
        await schema.dropIfExists('cache');
    },
};
