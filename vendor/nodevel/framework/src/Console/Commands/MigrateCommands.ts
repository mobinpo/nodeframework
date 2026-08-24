'use strict';

const Command = require('../Command') as new (app: any) => any;

export {};

class MigrateCommand extends Command {
    static signature =
        'migrate {--database= : The database connection to use} {--force : Run without confirmation} {--step : Run each migration as its own batch} {--pretend : Print the SQL without running}';
    static description = 'Run the database migrations';

    async handle(): Promise<any> {
        if (!this.app.isProduction() || this.option('force') || (await this.confirm('Run in production?', false))) {
            /* proceed */
        } else {
            this.warn('Operation cancelled.');
            return;
        }

        const migrator = this.app.make('migrator');
        await migrator.run({
            database: this.option('database'),
            pretend: Boolean(this.option('pretend')),
            step: Boolean(this.option('step')),
        });
        this.info('Migration completed successfully.');
    }
}

class MigrateRollbackCommand extends Command {
    static signature =
        'migrate:rollback {--database= : The database connection} {--force} {--step=1 : Number of migrations to roll back} {--batch= : Roll back a specific batch} {--pretend}';
    static description = 'Rollback the last database migration';

    async handle(): Promise<any> {
        await this.app.make('migrator').rollback({
            database: this.option('database'),
            step: this.option('step') ? Number(this.option('step')) : undefined,
            batch: this.option('batch'),
        });
        this.info('Rollback completed successfully.');
    }
}

class MigrateResetCommand extends Command {
    static signature = 'migrate:reset {--database=} {--force}';
    static description = 'Rollback all database migrations';

    async handle(): Promise<any> {
        await this.app.make('migrator').reset({ database: this.option('database') });
        this.info('Reset completed.');
    }
}

class MigrateRefreshCommand extends Command {
    static signature = 'migrate:refresh {--database=} {--force} {--step=} {--seed : Seed the database after refreshing}';
    static description = 'Reset and re-run all migrations';

    async handle(): Promise<any> {
        await this.app.make('migrator').rollback({ database: this.option('database'), step: 9999 });
        await this.app.make('migrator').run({ database: this.option('database') });

        if (this.option('seed')) {
            await runSeeder(this.app, 'DatabaseSeeder');
        }
        this.app.make('events').dispatch('DatabaseRefreshed', []);
        this.info('Refresh completed successfully.');
    }
}

class MigrateFreshCommand extends Command {
    static signature =
        'migrate:fresh {--database=} {--force} {--seed : Seed the database} {--drop-views}';
    static description = 'Drop all tables and re-run all migrations';

    async handle(): Promise<any> {
        await this.app.make('migrator').fresh({ database: this.option('database') });
        if (this.option('seed')) {
            await runSeeder(this.app, 'DatabaseSeeder');
        }
        this.info('Fresh migration completed successfully.');
    }
}

class MigrateStatusCommand extends Command {
    static signature = 'migrate:status {--database=}';
    static description = 'Show the status of each migration';

    async handle(): Promise<any> {
        const statuses = await this.app.make('migrator').status();
        this.table(
            ['Migration name', 'Status'],
            statuses.map((s) => [s.name, s.ran ? 'Ran' : 'Pending'])
        );
    }
}

async function runSeeder(app: any, seederName: string): Promise<void> {
    const file = app.databasePath('seeders', `${seederName}.js`);
    // eslint-disable-next-line import/no-dynamic-require
    const module = require(file);
    const SeederClass = module.default || Object.values(module)[0];
    const seeder = new SeederClass(app);
    await seeder.run();
    // eslint-disable-next-line no-console
    console.log(`Seeded: ${seederName}`);
}

module.exports = {
    default: MigrateCommand,
    Migrate: MigrateCommand,
    MigrateRollback: MigrateRollbackCommand,
    MigrateReset: MigrateResetCommand,
    MigrateRefresh: MigrateRefreshCommand,
    MigrateFresh: MigrateFreshCommand,
    MigrateStatus: MigrateStatusCommand,
};
