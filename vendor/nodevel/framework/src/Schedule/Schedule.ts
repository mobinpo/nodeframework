'use strict';

/**
 * Task scheduling — the equivalent of `Illuminate\Console\Scheduling`.
 *
 * Tasks are registered in `routes/console.js`:
 *
 *   const { schedule } = require('@nodevel/framework').Facades;
 *
 *   schedule.command('inspire')->hourly();
 *   schedule.call(() => console.log('tick'))->everyMinute();
 */

export {};

/** A task registered on the schedule: an artisan command or a closure. */
type ScheduledTask =
    | { type: 'command'; signature: string; expression?: string | null }
    | { type: 'call'; callback: (app: any) => any; expression?: string | null };

/** Fluent proxy returned when adding a task, used to set its frequency. */
interface PendingTask {
    cron(expression: string): PendingTask;
    withoutOverlapping(): PendingTask;
    onOneServer(): PendingTask;
    runInBackground(): PendingTask;
    /** Assigned after the base proxy object is built. */
    dailyAt?(time: string): PendingTask;
    [key: string]: any;
}

function matchesField(value: number, field: string): boolean {
    if (field === '*') return true;
    return field.split(',').some((part) => {
        const stepMatch = /^(\*\/(\d+)|(\d+)-(\d+)(?:\/(\d+))?|(\d+))$/.exec(part);
        if (!stepMatch) return false;
        if (stepMatch[2]) return value % Number(stepMatch[2]) === 0;
        if (stepMatch[3] !== undefined) {
            const low = Number(stepMatch[3]);
            const high = Number(stepMatch[4]);
            const step = stepMatch[5] ? Number(stepMatch[5]) : 1;
            if (value < low || value > high) return false;
            return (value - low) % step === 0;
        }
        return value === Number(stepMatch[6]);
    });
}

/** Match a 5-field cron expression against a Date (minute granularity). */
function cronMatches(expression: string, date: Date): boolean {
    const fields = expression.trim().split(/\s+/);
    if (fields.length !== 5) return false;
    const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
    return (
        matchesField(date.getMinutes(), minute) &&
        matchesField(date.getHours(), hour) &&
        matchesField(date.getDate(), dayOfMonth) &&
        matchesField(date.getMonth() + 1, month) &&
        matchesField(date.getDay(), dayOfWeek)
    );
}

const FREQUENCIES: Record<string, string> = {
    everyMinute: '* * * * *',
    hourly: '0 * * * *',
    daily: '0 0 * * *',
    weekly: '0 0 * * 0',
    monthly: '0 0 1 * *',
};

class Schedule {
    app: any;
    tasks: ScheduledTask[];

    constructor(app: any) {
        this.app = app;
        this.tasks = [];
    }

    /** Schedule an artisan command. */
    command(signature: string): PendingTask {
        return this.addTask({ type: 'command', signature });
    }

    /** Schedule an arbitrary callback. */
    call(callback: (app: any) => any): PendingTask {
        return this.addTask({ type: 'call', callback });
    }

    addTask(task: ScheduledTask): PendingTask {
        task.expression = null;
        const proxy: PendingTask = {
            cron: (expression) => {
                task.expression = expression;
                return proxy;
            },
            withoutOverlapping: () => proxy,
            onOneServer: () => proxy,
            runInBackground: () => proxy,
        };
        for (const [method, expression] of Object.entries(FREQUENCIES)) {
            proxy[method] = () => {
                task.expression = expression;
                return proxy;
            };
        }
        proxy.dailyAt = (time) => {
            const [hour, minute = '0'] = String(time).split(':');
            task.expression = `${Number(minute)} ${Number(hour)} * * *`;
            return proxy;
        };
        this.tasks.push(task);
        return proxy;
    }

    /** Tasks due at the given moment (defaults to now). */
    dueTasks(date: Date = new Date()): ScheduledTask[] {
        return this.tasks.filter((task) => task.expression && cronMatches(task.expression, date));
    }

    async run(date: Date = new Date()): Promise<string[]> {
        const results: string[] = [];
        for (const task of this.dueTasks(date)) {
            if (task.type === 'command') {
                const artisan = this.app.make('artisan');
                const [name, ...rest] = task.signature.split(/\s+/);
                const CommandClass = artisan.commands.get(name);
                if (!CommandClass) throw new Error(`Scheduled command not found: ${name}`);
                const instance = new CommandClass(this.app);
                await instance.run({ arguments: parseArguments(CommandClass, rest), options: {}, raw: rest });
                results.push(`Ran: ${task.signature}`);
            } else {
                await task.callback(this.app);
                results.push('Ran: closure');
            }
        }
        return results;
    }
}

function parseArguments(
    CommandClass: { parseSignature(): { arguments: { name: string; variadic?: boolean }[] } },
    tokens: string[]
): Record<string, any> {
    const { arguments: argDefs } = CommandClass.parseSignature();
    const parsed: Record<string, any> = {};
    let index = 0;
    for (const def of argDefs) {
        if (def.variadic) {
            parsed[def.name] = tokens.slice(index);
            break;
        }
        parsed[def.name] = tokens[index++];
    }
    return parsed;
}

module.exports = { Schedule, cronMatches };
