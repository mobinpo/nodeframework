'use strict';

const fs = require('fs');
const path = require('path');

const Command = require('../Command') as new (app: any) => any;

export {};

class EventListCommand extends Command {
    static signature = 'event:list {--event= : Filter events by name}';
    static description = "List the application's events and listeners";

    handle(): any {
        const dispatcher = this.app.make('events');
        const filter = this.option('event');

        const rows: any[][] = [];

        // Runtime-registered listeners.
        for (const [eventName, listeners] of dispatcher.listeners) {
            if (filter && !eventName.includes(filter)) continue;
            for (const listener of listeners) {
                rows.push([eventName, describeListener(listener)]);
            }
        }

        // Discovered event/listener classes in app/Events and app/Listeners.
        const eventsDir = this.app.appPath('Events');
        if (fs.existsSync(eventsDir)) {
            for (const file of fs.readdirSync(eventsDir).filter((f: string) => f.endsWith('.ts') || f.endsWith('.js'))) {
                const name = path.basename(file, path.extname(file));
                if (filter && !name.includes(filter)) continue;
                const listeners = findListenersFor(this.app.appPath('Listeners'), name);
                rows.push([`App\\Events\\${name}`, listeners.join(', ') || '—']);
            }
        }

        if (!rows.length) {
            this.warn('No registered events found.');
            return 0;
        }

        this.table(['Event', 'Listener'], rows);
        return 0;
    }
}

function describeListener(listener: any): string {
    if (typeof listener === 'function') return listener.name || '(closure)';
    if (listener && typeof listener.handle === 'function') {
        return listener.constructor.name + '@handle';
    }
    return String(listener);
}

function findListenersFor(listenersDir: string, eventName: string): string[] {
    if (!fs.existsSync(listenersDir)) return [];
    const matches: string[] = [];
    for (const file of fs.readdirSync(listenersDir).filter((f: string) => f.endsWith('.ts') || f.endsWith('.js'))) {
        try {
            // eslint-disable-next-line import/no-dynamic-require, global-require
            const loaded = require(path.join(listenersDir, file));
            for (const value of Object.values(loaded) as any[]) {
                const handles =
                    value &&
                    ((Array.isArray(value.listens) && value.listens.includes(eventName)) ||
                        (typeof value.subscribe === 'function'));
                if (handles) matches.push(path.basename(file, path.extname(file)));
            }
        } catch {
            // Skip unloadable listener files.
        }
    }
    return [...new Set(matches)];
}

module.exports = { default: EventListCommand, EventList: EventListCommand };
