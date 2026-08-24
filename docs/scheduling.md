# Task Scheduling

- [Introduction](#introduction)
- [Defining Schedules](#defining-schedules)
    - [Available Frequency Options](#available-frequency-options)
- [Running the Scheduler](#running-the-scheduler)

<a name="introduction"></a>
## Introduction

When deploying a web application, many tasks need to run periodically: send report emails, clean up database tables, prune stale sessions. Nodevel's task scheduler lets you fluently and expressively define command execution schedules inside your application — the equivalent of `Illuminate\Console\Scheduling`.

<a name="defining-schedules"></a>
## Defining Schedules

Define scheduled tasks in your application's `routes/console.js` file. The schedule instance is resolved from the container:

```js
module.exports = function registerConsoleRoutes(app) {
    const schedule = app.make('schedule');

    // Run an Artisan command...
    schedule.command('model:prune')->daily();
};
```

Because `schedule.command()` returns a fluent definition object, you can chain frequency methods:

```js
schedule.command('backup:run').dailyAt('02:00');
schedule.call(() => console.log('tick')).everyMinute();
schedule.command('reports:send').cron('0 9 * * 1');
```

<a name="available-frequency-options"></a>
### Available Frequency Options

| Method                     | Description                                  |
| -------------------------- | -------------------------------------------- |
| `.everyMinute()`           | Run the task every minute                    |
| `.hourly()`                | Run the task on the hour                     |
| `.daily()`                 | Run the task at midnight                     |
| `.dailyAt('13:00')`        | Run the task at 13:00                        |
| `.weekly()`                | Run the task every Sunday at midnight        |
| `.monthly()`               | Run the task on the first day of each month  |
| `.cron('* * * * *')`       | Run the task on a custom cron schedule       |

The `.cron()` expression follows standard five-field cron syntax (minute, hour, day-of-month, month, day-of-week), including steps (`*/15`) and lists (`1,15`).

<a name="running-the-scheduler"></a>
## Running the Scheduler

In production, the scheduler is driven by a single cron entry that invokes `schedule:run` every minute:

```shell
* * * * * cd /path-to-your-project && node bin/artisan.js schedule:run >> /dev/null 2>&1
```

`schedule:run` evaluates every defined task against the current minute and executes only those that are due. To inspect the registered tasks without running them:

```shell
node bin/artisan.js schedule:list
```
