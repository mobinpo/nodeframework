'use strict';

const Command = require('../Command') as new (app: any) => any;

export {};

class QueueWorkCommand extends Command {
    static signature =
        'queue:work {--queue=default : The queue to listen on} {--once : Stop after the next job} {--stop-when-empty : Stop when the queue is empty} {--tries=3 : Number of times to attempt a job} {--sleep=1 : Sleep duration between polls, in seconds}';
    static description = 'Start processing jobs off the queue as a daemon';

    async handle(): Promise<any> {
        const worker = this.app.make('queue.worker');
        worker.sleepMs = Math.max(0, Number(this.option('sleep')) * 1000);
        worker.maxJobs = this.option('once') ? 1 : Infinity;

        if (this.option('stop-when-empty') && !this.option('once')) {
            // Drain the queue, then exit.
            const count = await worker.drain(this.option('queue'), Number(this.option('tries')) || 3);
            this.info(`Processed ${count} job${count === 1 ? '' : 's'}; queue is empty.`);
            return;
        }

        this.line(`Processing jobs from the [${this.option('queue')}] queue. Press Ctrl+C to stop.`);
        await worker.run({
            queue: this.option('queue'),
            tries: Number(this.option('tries')) || 3,
        });
    }
}

class QueueTableCommand extends Command {
    static signature = 'queue:table';
    static description = 'Create the queue database table';

    async handle(): Promise<any> {
        const { DatabaseQueue } =
            require('../../Queue/QueueManager');
        const queueName = 'database';
        let driver;
        try {
            driver = this.app.make('queue').connection(queueName);
        } catch (error) {
            // Connection not memoized as a DatabaseQueue yet — build one.
            if (!/Unsupported queue driver/.test((error as Error).message)) throw error;
            driver = new DatabaseQueue(this.app);
        }
        if (!(driver instanceof DatabaseQueue)) {
            this.warn('The [database] queue connection is not using the database driver.');
            return 1;
        }
        await driver.ensureTable();
        this.info('Queue table created successfully.');
    }
}


class QueueRestartCommand extends Command {
    static signature = 'queue:restart';
    static description = 'Restart queue workers after their current job finishes';

    handle(): any {
        const fs = require('fs');
        const path = require('path');
        const file = path.join(this.app.storagePath('framework'), 'queue-restart');

        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, String(Date.now()));
        this.info('Broadcasting queue restart signal.');
        return 0;
    }
}

module.exports = { QueueWork: QueueWorkCommand, QueueTable: QueueTableCommand, QueueRestart: QueueRestartCommand };
