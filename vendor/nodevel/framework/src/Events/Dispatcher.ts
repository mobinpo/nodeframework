'use strict';

/**
 * The event dispatcher — a port of `Illuminate\Events\Dispatcher`.
 */

export {};

/** A listener: a plain function or a string class name resolved via the container. */
type Listener = ((...args: any[]) => any) | string;

interface WildcardListener {
    pattern: RegExp;
    listener: Listener;
}

class Dispatcher {
    container: any;
    listeners: Map<string, Listener[]>;
    wildcards: WildcardListener[];
    // Queued dispatches awaiting listeners (for `event:generate` style
    // discovery we simply store event names).
    dispatchedNames: Set<string>;

    constructor(container: any = null) {
        this.container = container;
        this.listeners = new Map();
        this.wildcards = [];
        this.dispatchedNames = new Set();
    }

    listen(events: string | string[], listener: Listener): void {
        for (const event of ArrWrap(events)) {
            if (event.includes('*')) {
                this.wildcards.push({ pattern: wildcardToRegExp(event), listener });
            } else {
                const list = this.listeners.get(event) || [];
                list.push(listener);
                this.listeners.set(event, list);
            }
        }
    }

    hasListeners(eventName: string): boolean {
        return this.listeners.has(eventName) || this.wildcards.some((w) => w.pattern.test(eventName));
    }

    subscribe(subscriber: { subscribe: (dispatcher: Dispatcher) => void }): void {
        subscriber.subscribe(this);
    }

    until(event: string, payload?: any): any {
        for (const listener of this.getListeners(event)) {
            const result = invoke(listener, payload, this);
            if (result !== undefined && result !== null) return result;
        }
        return null;
    }

    async dispatch(event: any, payload: any = []): Promise<boolean> {
        if (typeof event === 'string') this.dispatchedNames.add(event);
        else if (event && event.constructor) this.dispatchedNames.add(event.constructor.name);

        const name = typeof event === 'string' ? event : event?.constructor?.name;
        const args = Array.isArray(payload) ? payload : [payload];

        let halted = false;
        for (const listener of this.getListeners(name || '')) {
            const result = await invoke(listener, args, this);
            if (result === false) halted = true;
        }
        return !halted;
    }

    getListeners(eventName: string): Listener[] {
        return [
            ...(this.listeners.get(eventName) || []),
            ...this.wildcards.filter((w) => w.pattern.test(eventName)).map((w) => w.listener),
        ];
    }
}

function ArrWrap(value: string | string[]): string[] {
    return Array.isArray(value) ? value : [value];
}

async function invoke(listener: Listener, args: any, dispatcher: Dispatcher): Promise<any> {
    if (typeof listener === 'string') {
        // Class reference resolved via the container.
        if (!dispatcher.container) throw new Error(`Cannot resolve string listener "${listener}" without a container.`);
        const instance = dispatcher.container.make(listener);
        return instance.handle(...args);
    }
    return listener(...args);
}

function wildcardToRegExp(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
}

module.exports = Dispatcher;
