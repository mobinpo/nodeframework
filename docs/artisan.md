# Artisan Console

- [Introduction](#introduction)
- [Writing Commands](#writing-commands)
    - [Defining Input Expectations](#defining-input-expectations)
    - [I/O](#io)
- [Registering Commands](#registering-commands)
- [Programmatically Executing Commands](#programmatically-executing-commands)

<a name="introduction"></a>
## Introduction

Artisan is the command-line interface included with Nodevel. It is invoked with `npx tsx bin/artisan.ts` (or `npm run artisan --`). To view a list of all available Artisan commands:

```shell
npx tsx bin/artisan.ts list
```

Every command also includes a help screen describing available arguments and options:

```shell
npx tsx bin/artisan.ts migrate --help
```

Core commands include:

| Command            | Description                                    |
| ------------------ | ---------------------------------------------- |
| `serve`            | Start the development server.                  |
| `test`             | Run the application tests.                     |
| `migrate`          | Run database migrations.                       |
| `db:seed`          | Seed the database (`--class=` to choose one).  |
| `db:wipe`          | Drop all tables.                               |
| `queue:work`       | Process queued jobs as a daemon.               |
| `queue:table`      | Create the `jobs` database table.              |
| `schedule:run`     | Run due scheduled tasks (wire to cron).        |
| `schedule:list`    | List scheduled tasks and their cron expressions. |
| `route:list`       | List all registered routes.                    |
| `about`            | Show an environment / driver overview.         |
| `make:*`           | Generate controllers, models, events, and more.|
| `key:generate`     | Set the application encryption key.            |
| `config:cache`     | Cache configuration for production.            |
| `down` / `up`      | Toggle maintenance mode.                       |
| `storage:link`     | Create the public storage symlink.             |
| `tinker`           | Open a REPL with the app booted.               |

<a name="writing-commands"></a>
## Writing Commands

Generate a command class in `app/Console/Commands` (create the directory if needed) or write one by hand:

```js
'use strict';

const Command = require('@nodevel/framework').Console.Command;

class SendEmailsCommand extends Command {
    static signature = 'mail:send {user : The ID of the user} {--queue : Whether to queue}';
    static description = 'Send a marketing email to a user';

    async handle() {
        const user = this.argument('user');
        const queued = this.option('queue');

        this.info(`Sending email to ${user}${queued ? ' (queued)' : ''}!`);
    }
}

module.exports = { default: SendEmailsCommand, SendEmailsCommand };
```

The signature's first token is the command name; `{...}` tokens declare arguments and options.

<a name="defining-input-expectations"></a>
### Defining Input Expectations

Arguments and options are defined in braces:

```text
mail:send {user}
mail:send {user*}              // variadic array argument
mail:send {--queue}            // boolean flag
mail:send {--queue=default}    // option taking a value with default
```

Retrieve them with `this.argument('user')` and `this.option('queue')`.

<a name="io"></a>
### I/O

Commands extend `Illuminate\Console\Command` equivalents with output helpers:

```js
this.line('plain text');
this.info('green text');
this.warn('yellow text');
this.error('red text');

this.table(['Name', 'Email'], [['Taylor', 'taylor@example.com']]);
```

Prompts (`ask`, `confirm`, `secret`) resolve to their defaults in non-interactive contexts, so commands remain scriptable.

<a name="registering-commands"></a>
## Registering Commands

All classes exported from files in `app/Console/Commands` are discovered automatically. Closure-style commands can be registered in `routes/console.js`:

```js
module.exports = function registerConsoleRoutes(app) {
    const artisan = app.make('artisan');

    artisan.add(class Inspire extends Command {
        static signature = 'inspire';
        async handle() { this.line('Simplicity is the ultimate sophistication.'); }
    });
};
```

<a name="programmatically-executing-commands"></a>
## Programmatically Executing Commands

```js
const code = await app.make('artisan').run(['migrate', '--force']);
```
