'use strict';

/**
 * Closure-based console commands and task scheduling — the equivalent of
 * Laravel's `routes/console.php`.
 *
 *   Artisan.command('greet {name}', (app) => { ... });
 *   Schedule.command('model:prune')->daily();
 */

module.exports = function registerConsoleRoutes(app: any): void {
    const artisan = app.make('artisan');
    const schedule = app.make('schedule');

    // A closure-based command.
    artisan.command(
        'inspire',
        () => {
            app.make('artisan');
            console.log('\n  Simplicity is the ultimate sophistication.\n');
        },
        'Display an inspiring quote'
    );

    // Scheduled tasks — executed by `schedule:run` (wire it to cron).
    // schedule.command('backup:run')->dailyAt('02:00');
    void schedule;
};

export {};
