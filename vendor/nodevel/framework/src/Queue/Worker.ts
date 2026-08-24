'use strict';

export {};

/**
 * The queue worker — the equivalent of `queue:work`.
 */

interface WorkerOptions {
    queue?: string;
    once?: boolean;
    tries?: number;
}

interface QueueJob {
    id: any;
    payload: string | null;
    attempts?: number;
    queue?: string;
}

class Worker {
    app: any;
    running: boolean;
    sleepMs: number;
    maxJobs: number;
    declare startedAt: number | undefined;

    constructor(app: any) {
        this.app = app;
        this.running = false;
        this.sleepMs = 1000;
        this.maxJobs = Infinity;
    }

    async run(options: WorkerOptions = {}): Promise<boolean> {
        const queue = this.app.make('queue').connection(options.queue);
        this.running = true;
        let processed = 0;

        while (this.running && processed < this.maxJobs) {
            if (this.restartSignalled()) {
                this.app.make('log').info('Queue worker restarting on signal.');
                break;
            }

            const job = await queue.pop(options.queue || 'default');

            if (!job) {
                if (options.once) return true;
                await sleep(this.sleepMs);
                continue;
            }

            try {
                const payload = JSON.parse(job.payload || '{}');
                const QueueManager = require('./QueueManager');
                await QueueManager.runJobFromPayload?.(this.app, payload);

                // Fallback resolution: dispatch through the job bus.
                await dispatchJob(this.app, payload);
                await queue.deleteJob(job);
                processed++;
            } catch (error) {
                const err = error as Error;
                const attempts = Number(job.attempts || 0) + 1;
                const maxTries = options.tries ?? 3;

                if (attempts >= maxTries) {
                    await queue.deleteJob(job);
                    await storeFailedJob(this.app, job, err);
                    this.app.make('log').error(`Job failed permanently: ${err.message}`);
                    this.app.make('events').dispatch('job.failed', [err]);
                } else {
                    await queue.release(job, attempts * 5);
                }
            }
        }

        return true;
    }

    /** Drain the queue until empty; returns the number of processed jobs. */
    async drain(queueName: string = 'default', tries: number = 3): Promise<number> {
        let count = 0;
        this.running = true;
        for (;;) {
            const queue = this.app.make('queue').connection(queueName);
            const job = await queue.pop(queueName);
            if (!job) break;
            try {
                await dispatchJob(this.app, JSON.parse(job.payload || '{}'));
                await queue.deleteJob(job);
                count++;
            } catch (error) {
                const err = error as Error;
                const attempts = Number(job.attempts || 0) + 1;
                if (attempts >= tries) {
                    await queue.deleteJob(job);
                    await storeFailedJob(this.app, job, err);
                    this.app.make('log').error(`Job failed permanently: ${err.message}`);
                    this.app.make('events').dispatch('job.failed', [err]);
                    count++;
                } else {
                    await queue.release(job, attempts * 5);
                }
            }
        }
        this.running = false;
        return count;
    }

    stop(): void {
        this.running = false;
    }

    /** True when `queue:restart` has been signalled since this worker started. */
    restartSignalled(): boolean {
        try {
            const fs = require('fs');
            const path = require('path');
            const file = path.join(this.app.storagePath('framework'), 'queue-restart');
            if (!this.startedAt) this.startedAt = Date.now();
            if (!fs.existsSync(file)) return false;
            return Number(fs.readFileSync(file, 'utf8')) > this.startedAt;
        } catch {
            return false;
        }
    }
}

async function dispatchJob(app: any, payload: { job: string; data?: any }): Promise<void> {
    const jobsDir = app.appPath('Jobs');
    try {
        const JobClass = require(`${jobsDir}/${payload.job}`);
        const instance = new JobClass(payload.data);
        await instance.handle();
    } catch (error) {
        if ((error as any).code === 'MODULE_NOT_FOUND') throw new Error(`Job class not found: ${payload.job}`);
        throw error;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

module.exports = { Worker };

/**
 * Persist a failed job into the `failed_jobs` table — the equivalent of
 * Laravel's `fail()` on the database queue job.
 */
async function storeFailedJob(app: any, job: QueueJob, error: Error): Promise<string | null> {
    try {
        const uuid = require('crypto').randomUUID();
        await app
            .make('db')
            .table('failed_jobs')
            .insert({
                uuid,
                connection: 'database',
                queue: job.queue || 'default',
                payload: job.payload || '',
                exception: String(error?.stack || error?.message || error),
                failed_at: new Date().toISOString(),
            });
        return uuid;
    } catch (storageError) {
        // Surface for debugging; production callers keep working.
        if (process.env.NODEVEL_DEBUG_QUEUE) {
            console.error('storeFailedJob failed:', (storageError as Error).message);
        }
        return null;
    }
}
