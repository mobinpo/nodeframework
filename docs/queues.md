# Queues

- [Introduction](#introduction)
    - [Connections Vs. Queues](#connections-vs-queues)
- [Creating Jobs](#creating-jobs)
- [Dispatching Jobs](#dispatching-jobs)
- [Running the Queue Worker](#running-the-queue-worker)
- [Dealing With Failed Jobs](#dealing-with-failed-jobs)

<a name="introduction"></a>
## Introduction

Nodevel queues allow you to defer the processing of a time consuming task, such as sending an email, until a later time — drastically speeding up web requests.

Queue configuration lives in `config/queue.js`. Drivers:

| Driver      | Description                                              |
| ----------- | -------------------------------------------------------- |
| `sync`      | Executes jobs immediately in the current process.        |
| `file`      | Persists pending jobs on the local filesystem (default). |
| `database`  | Stores jobs in a SQL table (`jobs`).                     |

<a name="connections-vs-queues"></a>
### Connections Vs. Queues

A *connection* is the backend driver; a *queue* is a named channel inside it. Jobs pushed without a queue name land on `default`.

<a name="creating-jobs"></a>
## Creating Jobs

```shell
node bin/artisan.js make:job ProcessPodcast
```

```js
'use strict';

class ProcessPodcast {
    constructor(data = {}) {
        this.data = data;
    }

    async handle() {
        // Process the podcast...
    }
}

module.exports = { default: ProcessPodcast, ProcessPodcast };
```

<a name="dispatching-jobs"></a>
## Dispatching Jobs

```js
const app = require('./bootstrap');

await app.make('queue').push('ProcessPodcast', { podcastId: 1 });

// Delay execution:
await app.make('queue').later(60, 'ProcessPodcast', { podcastId: 1 });
```

The first argument names the job class file inside `app/Jobs`; the second carries its payload.

<a name="running-the-queue-worker"></a>
## Running the Queue Worker

Laravel-style Artisan commands drive the worker:

```shell
node bin/artisan.js queue:work                     # daemon mode
node bin/artisan.js queue:work --once              # process a single job
node bin/artisan.js queue:work --stop-when-empty   # drain, then exit
node bin/artisan.js queue:work --queue=emails      # listen on another queue
```

Programmatically, the same behaviour is available on the worker instance:

```js
const worker = app.make('queue.worker');
await worker.run({ tries: 3 });   // poll forever
await worker.drain();             // process everything, then stop
```

The worker polls the connection, executes each job's `handle()`, deletes it on success, releases it for retry (with escalating delay) up to `tries` attempts, then marks it failed.

The `jobs` table used by the `database` queue connection can be created with:

```shell
node bin/artisan.js queue:table
```

<a name="dealing-with-failed-jobs"></a>
## Dealing With Failed Jobs

Inspect failure counts with `queue:failed` and retry with `queue:retry <id>`:

```shell
node bin/artisan.js queue:failed
node bin/artisan.js queue:retry 1
```

Failed job events are dispatched through the event dispatcher so listeners can log or alert.
