# Envoy Task Runner

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Running Remote Tasks](#running-remote-tasks)

<a name="introduction"></a>
## Introduction

Laravel Envoy provides a clean, minimal syntax for running common tasks on remote servers (deploys, cache warming).

<a name="nodevel-status"></a>
## Nodevel Status

Not implemented as a Blade-style DSL. Nodevel covers the local-process half through the `Process` layer documented in [processes](/framework/docs/processes), and remote execution is a shell concern.

<a name="running-remote-tasks"></a>
## Running Remote Tasks

Model deploy tasks as Artisan commands and drive them with any task runner (`make`, `npm scripts`, CI pipelines):

```js
// app/Console/Commands/DeployCommand.js
const Command = require('@nodevel/framework').Console.Command;
const { execSync } = require('child_process');

class DeployCommand extends Command {
    static signature = 'deploy {--branch=main}';
    static description = 'Pull latest code and warm caches on this host';

    async handle() {
        const branch = this.option('branch');
        execSync(`git fetch --all && git checkout ${branch} && git pull`, { stdio: 'inherit' });
        await new (require('../SystemCommands').OptimizeCommand.prototype.constructor)(this.app);
        this.info('Deployed.');
    }
}

module.exports = { default: DeployCommand, Deploy: DeployCommand };
```

Schedule it or invoke it over SSH:

```shell
ssh deploy@server "cd /var/www/app && npx tsx bin/artisan.ts deploy"
```
