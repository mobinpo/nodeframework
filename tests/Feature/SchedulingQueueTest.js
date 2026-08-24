'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createTestApp } = require('../bootstrap');

let ctx;

module.exports.tests = [
    {
        name: 'queue: file driver push/pop/drain',
        async setup() {
            ctx = ctx || (await createTestApp());
        },
        async fn() {
            const { assertEqual } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');
            const { FileQueue } =
                require('../../vendor/nodevel/framework/src/Queue/QueueManager');

            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodevel-queue-'));
            const queue = new FileQueue(dir);

            await queue.push('ProcessPodcast', { id: 1 });
            await queue.push('ProcessPodcast', { id: 2 });
            assertEqual(await queue.size(), 2);

            const first = await queue.pop();
            assertEqual(JSON.parse(first.payload).job, 'ProcessPodcast');
            assertEqual(JSON.parse(first.payload).data.id, 1);
            // Popped jobs stay reserved until deleted.
            await queue.deleteJob(first);
            assertEqual(await queue.size(), 1);

            // Delayed jobs are not popped early.
            await queue.push('Later', {}, 'default', 3600);
            const next = await queue.pop();
            assertEqual(JSON.parse(next.payload).job, 'ProcessPodcast');

            // Worker drain runs job classes from app/Jobs.
            const app = ctx.app;
            const jobsDir = path.join(app.appPath('Jobs'));
            fs.mkdirSync(jobsDir, { recursive: true });
            const worker = app.make('queue.worker');
            const drainDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodevel-drain-'));
            const markerFile = path.join(drainDir, 'handled.json');
            fs.writeFileSync(
                path.join(jobsDir, 'DrainTestJob.js'),
                `'use strict';
class DrainTestJob {
    constructor(data) { this.data = data || {}; }
    async handle() {
        require('fs').writeFileSync('${markerFile}', JSON.stringify(this.data));
    }
}
module.exports = DrainTestJob;
`
            );

            // Push through a fresh FileQueue the worker can pop.
            const originalConnection = app.make('queue').connection.bind(app.make('queue'));
            app.make('queue').connection = () => new FileQueue(drainDir);
            const fq = new FileQueue(drainDir);
            await fq.push('DrainTestJob', { ok: true });
            const processed = await worker.drain('default', 3);
            assertEqual(processed, 1);
            assertEqual(JSON.parse(fs.readFileSync(markerFile, 'utf8')).ok, true);
            app.make('queue').connection = originalConnection;
        },
    },
    {
        name: 'schedule: dueTasks and run execute closures and commands',
        async fn() {
            const { assertEqual } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const schedule = ctx.app.make('schedule');
            let ran = false;
            schedule.call(() => {
                ran = true;
            }).everyMinute();

            // A command scheduled at this exact minute.
            const now = new Date();
            schedule.command('inspire').cron(`${now.getMinutes()} ${now.getHours()} * * *`);

            const due = schedule.dueTasks(now);
            assertEqual(due.length, 2);

            const results = await schedule.run(now);
            assertEqual(results.length, 2);
            assertEqual(ran, true);
        },
    },
];
