'use strict';

/**
 * Create the jobs, failed_jobs, and job_batches tables — the equivalent of
 * Laravel's default `0001_01_01_000002_create_jobs_table.php` migration.
 */

interface SchemaBuilder {
    create(name: string, callback: (table: any) => void): Promise<unknown>;
    dropIfExists(name: string): Promise<unknown>;
}

module.exports = {
    async up(schema: SchemaBuilder): Promise<void> {
        await schema.create('jobs', (table) => {
            table.id();
            table.string('queue').index();
            table.text('payload');
            table.integer('attempts').default(0);
            table.integer('reserved_at').nullable();
            table.integer('available_at');
            table.integer('created_at');
        });

        await schema.create('job_batches', (table) => {
            table.string('id').primary();
            table.string('name');
            table.integer('total_jobs');
            table.integer('pending_jobs');
            table.integer('failed_jobs');
            table.text('failed_job_ids');
            table.text('options').nullable();
            table.integer('cancelled_at').nullable();
            table.integer('created_at');
            table.integer('finished_at').nullable();
        });

        await schema.create('failed_jobs', (table) => {
            table.id();
            table.string('uuid').unique();
            table.string('connection');
            table.string('queue');
            table.text('payload');
            table.text('exception');
            table.timestamp('failed_at');
        });
    },

    async down(schema: SchemaBuilder): Promise<void> {
        await schema.dropIfExists('failed_jobs');
        await schema.dropIfExists('job_batches');
        await schema.dropIfExists('jobs');
    },
};

export {};
