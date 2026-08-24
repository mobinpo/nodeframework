'use strict';

const Command = require('../Command') as new (app: any) => any;

export {};

class ScheduleRunCommand extends Command {
    static signature = 'schedule:run';
    static description = 'Run the scheduled commands';

    async handle(): Promise<any> {
        const results = await this.app.make('schedule').run();
        if (!results.length) {
            this.line('No scheduled tasks are due.');
            return;
        }
        for (const result of results) this.info(result);
    }
}

class ScheduleListCommand extends Command {
    static signature = 'schedule:list';
    static description = 'List the scheduled commands';

    async handle(): Promise<any> {
        const tasks = this.app.make('schedule').tasks;
        if (!tasks.length) {
            this.line('No scheduled tasks have been defined.');
            return;
        }
        this.table(
            ['Task', 'Expression'],
            tasks.map((task: any) => [task.type === 'command' ? task.signature : 'Closure', task.expression || '-'])
        );
    }
}

module.exports = { ScheduleRun: ScheduleRunCommand, ScheduleList: ScheduleListCommand };
