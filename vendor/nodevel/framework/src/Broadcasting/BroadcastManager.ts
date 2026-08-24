'use strict';

export {};

/**
 * Broadcasting — the equivalent of `Illuminate\Broadcasting`.
 *
 * Drivers: `log` (development), `pusher` (requires the pusher npm package),
 * and a local in-process driver for testing.
 */

type ChannelAuthCallback = (user: any, ...params: any[]) => any;

interface ChannelAuthEntry {
    callback: ChannelAuthCallback;
    options: { guests?: boolean; [key: string]: any };
}

class LogBroadcaster {
    logger: any;

    constructor(logger: any) {
        this.logger = logger;
    }

    async broadcast(channels: string[], event: string, payload: any = []): Promise<boolean> {
        this.logger.info(`Broadcasting [${event}] on channels: ${channels.join(', ')}`, { payload });
        return true;
    }
}

class PusherBroadcaster {
    pusher: any;

    constructor(config: Record<string, any>) {
        const Pusher = require('pusher');
        this.pusher = new Pusher({
            appId: config.app_id,
            key: config.app_key,
            secret: config.app_secret,
            cluster: config.app_cluster || 'mt1',
            useTLS: (config.scheme || 'https') === 'https',
        });
    }

    broadcast(channels: string[], event: string, payload: any[]): any {
        return this.pusher.trigger(channels, event, ...payload);
    }
}

/** An in-memory broadcaster collecting broadcasts — used in tests. */
class ArrayBroadcaster {
    broadcasts: Array<{ channels: string[]; event: string; payload: any }>;

    constructor() {
        this.broadcasts = [];
    }

    async broadcast(channels: string[], event: string, payload: any[]): Promise<boolean> {
        this.broadcasts.push({ channels, event, payload: payload[0] ?? null });
        return true;
    }
}

const channelAuthorizationCallbacks = new Map<RegExp, ChannelAuthEntry>();

const BroadcastManager = {
    /** Register a private channel authorization callback — Broadcast::channel. */
    channel(pattern: string | RegExp, callback: ChannelAuthCallback, options: ChannelAuthEntry['options'] = {}): boolean {
        const regex = new RegExp(
            `^${String(pattern).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{(\w+)\\\}/g, (_m, name) => `(?<${name}>[^.]+)`)}$`
        );
        channelAuthorizationCallbacks.set(regex, { callback, options });
        return true;
    },

    getChannelCallbacks(): Map<RegExp, ChannelAuthEntry> {
        return channelAuthorizationCallbacks;
    },

    /**
     * Resolve authorization for a channel + user.
     * Returns true/false or presence data for presence channels.
     */
    async authorizeChannel(channelName: string, user: any, params: Record<string, any> = {}): Promise<any> {
        for (const [regex, entry] of channelAuthorizationCallbacks) {
            const match = regex.exec(channelName);
            if (!match) continue;

            if (!user && !entry.options.guests) return false;

            const wildcardParams = Object.values(match.groups || {}).map((v) =>
                /^\d+$/.test(v) ? Number(v) : v
            );
            const result = await entry.callback(user, ...(user ? wildcardParams : wildcardParams));
            return result === undefined ? false : result;
        }
        return false;
    },
};

class BroadcastManagerImpl {
    app: any;

    constructor(app: any) {
        this.app = app;
    }

    connection(name: string | null = null): any {
        const driver = name || this.app.config('broadcasting.default', 'null');
        switch (driver) {
            case 'log':
                return new LogBroadcaster(this.app.make('log'));
            case 'pusher':
                return new PusherBroadcaster(
                    this.app.config('broadcasting.connections.pusher', {})
                );
            case 'array':
                return new ArrayBroadcaster();
            case 'null':
                return { async broadcast() { return true; } };
            default:
                throw new Error(`Unsupported broadcast driver [${driver}].`);
        }
    }

    /** Queue an event broadcast on its channels. */
    async queueEvent(eventInstance: any): Promise<any> {
        const channels: string[] = await Promise.resolve(eventInstance.broadcastOn()).then((c: any[]) =>
            c.map((channel: any) => channel.name || String(channel))
        );
        const eventName =
            typeof eventInstance.broadcastAs === 'function'
                ? eventInstance.broadcastAs()
                : eventInstance.constructor.name;
        const payload =
            typeof eventInstance.broadcastWith === 'function'
                ? eventInstance.broadcastWith()
                : publicPropertiesOf(eventInstance);

        return this.connection().broadcast(channels, eventName, [payload]);
    }
}

function publicPropertiesOf(instance: Record<string, any>): Record<string, any> {
    const output: Record<string, any> = {};
    for (const key of Object.keys(instance)) {
        if (key.startsWith('_')) continue;
        const value = instance[key];
        output[key] = value && typeof value.toArray === 'function' ? value.toArray() : value;
    }
    return output;
}

module.exports = {
    BroadcastManager: BroadcastManagerImpl,
    channelRegistry: BroadcastManager,
    ArrayBroadcaster,
};
