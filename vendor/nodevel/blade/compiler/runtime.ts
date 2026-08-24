'use strict';

export {};

/**
 * Runtime helpers made available to every compiled Blade template.
 *
 * The runtime is constructed per render with the view's data and a set of
 * environment callbacks supplied by the framework's view factory.
 */

const escapeHtml = require('./escape');
const { runtimeCustomIfs } = require('./registry');

interface OutputOptions {
    raw?: boolean;
}

/** Environment callbacks supplied by the framework's view factory. */
interface RenderEnv {
    output(chunk: unknown, opts?: OutputOptions): void;
    include(view: string, data?: Record<string, unknown>, opts?: Record<string, unknown>): unknown;
    exists(view: string): unknown;
    renderComponent?(
        name: string,
        attributes: Record<string, unknown>,
        slot: string,
        slots: Record<string, unknown>
    ): Promise<void> | void;
    setExtends(view: string): void;
    onSection?(name: string, content: string): void;
    csrfToken?: () => string;
    errors?: () => any;
    authCheck?: (...args: unknown[]) => boolean;
    app?: any;
    importClass?: (path: string) => unknown;
}

/** Per-render options: the env callbacks plus the factory callbacks and extras. */
interface RenderOptions {
    env: RenderEnv;
    sections?: Map<string, string>;
    viewName?: string;
    include(view: string, data?: Record<string, unknown>, opts?: Record<string, unknown>): unknown;
    exists(view: string): unknown;
    setExtends(view: string): void;
    renderComponent?(
        name: string,
        attributes: Record<string, unknown>,
        slot: string,
        slots: Record<string, unknown>
    ): Promise<void> | void;
    onSection?(name: string, content: string): void;
}

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
}

function looseEquals(a: unknown, b: unknown): boolean {
    // PHP `==`-like semantics for switch cases.
    if (a === b) return true;
    // eslint-disable-next-line eqeqeq
    return a == b;
}

function entries(value: any): Array<[string | number, any]> {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value.map((v: any, k: number) => [k, v]);
    if (typeof value === 'object' && typeof value[Symbol.iterator] !== 'function') {
        if (typeof value.entries === 'function') return [...value.entries()];
        return Object.entries(value);
    }
    const out: Array<[string | number, any]> = [];
    let i = 0;
    for (const v of value) out.push([i++, v]);
    return out;
}

class LoopData {
    index: number;
    iteration: number;
    count: number;
    remaining: number;
    first: boolean;
    last: boolean;
    even: boolean;
    odd: boolean;
    depth: number;
    parent: LoopData | null;

    constructor(index: number, count: number, parent: LoopData | null) {
        this.index = index;
        this.iteration = index + 1;
        this.count = count;
        this.remaining = Math.max(count - index - 1, 0);
        this.first = index === 0;
        this.last = index === count - 1;
        this.even = index % 2 === 1;
        this.odd = index % 2 === 0;
        this.depth = (parent ? parent.depth : 0) + 1;
        this.parent = parent || null;
    }
}

class BreakSignal extends Error {
    constructor() {
        super('__blade_break__');
    }
}

interface StackFrame {
    name: string;
    mode: string;
    capture: string;
}

interface SectionFrame {
    name: string;
    capture: string;
    overwrite: boolean;
    /** Read by __sectionStore/__sectionShow exactly as in the original. */
    content?: any;
}

/**
 * Build a render scope: `{ data, extra, helpers }` consumed by compiled code
 * via `with` blocks, plus the helper object itself.
 */
function createRuntime(data: Record<string, unknown>, options: RenderOptions) {
    const env: RenderEnv = options.env || ({} as RenderEnv);
    const views = new Map<string, string[]>(); // stack name -> { items: [], mode }
    let activeStack: StackFrame | null = null;

    let switchValue: any;
    const switchState = { matched: false };
    let breakRequested = false;

    const sections: Map<string, string> = options.sections || new Map();
    const sectionStack: SectionFrame[] = [];
    let lastSectionName: string | null = null;

    const fragments: Record<string, string> = {};
    let currentFragment: string | null = null;

    function output(chunk: unknown, opts: OutputOptions = {}): void {
        if (currentFragment !== null) {
            fragments[currentFragment] += opts.raw ? String(chunk) : escapeHtml(String(chunk ?? ''));
            return;
        }
        if (activeStack && activeStack.capture !== undefined) {
            activeStack.capture += opts.raw ? String(chunk) : escapeHtml(String(chunk ?? ''));
            return;
        }
        env.output(chunk, opts);
    }

    const helpers = {
        esc: escapeHtml,
        e: escapeHtml,
        ensureArray,
        __BreakSignal: BreakSignal,

        __isset: (v: any): boolean => v !== undefined && v !== null,
        __empty: (v: any): boolean => {
            if (v === undefined || v === null || v === '' || v === 0 || v === false) return true;
            if (Array.isArray(v)) return v.length === 0;
            if (typeof v === 'object') {
                if (typeof v.size === 'number') return v.size === 0;
                if (typeof v.length === 'number') return v.length === 0;
                return Object.keys(v).length === 0;
            }
            return false;
        },
        __entries: entries,
        __looseEquals: looseEquals,
        __loop: (index: number, count: number, parent: LoopData | null): LoopData =>
            new LoopData(index, count, parent),

        __output: output,

        // -- Includes / each ---------------------------------------------------
        __include: async (view: string, dataOverride?: Record<string, unknown>) =>
            options.include(view, dataOverride || {}),

        __exists: async (view: string) => options.exists(view),

        __includeFirst: async (views_: string | string[], dataOverride?: Record<string, unknown>) => {
            for (const view of ensureArray(views_)) {
                if (await options.exists(view)) return options.include(view, dataOverride || {});
            }
            throw new Error(`None of the views exist: ${ensureArray(views_).join(', ')}`);
        },

        __includeIsolated: async (view: string, dataOverride?: Record<string, unknown>) =>
            options.include(view, dataOverride || {}, { isolated: true }),

        // -- Components ------------------------------------------------------------
        // `<x-alert>` compiles to `__component('alert', attrs, slotHtml, slots)`.
        __component: async (
            name: string,
            attributes: Record<string, unknown> = {},
            slot: unknown = '',
            slots: Record<string, unknown> = {}
        ): Promise<void> => {
            if (!options.renderComponent) {
                throw new Error(`Component [${name}] cannot be rendered here.`);
            }
            await options.renderComponent(name, attributes || {}, String(slot || ''), slots || {});
        },

        __each: async (view: string, iterable: any, variable: string, emptyView: string | null): Promise<void> => {
            const items = entries(iterable);
            if (items.length === 0) {
                if (emptyView) await options.include(emptyView, {}, { isolated: true });
                return;
            }
            for (const [, item] of items) {
                await options.include(view, { [variable]: item }, { isolated: true });
            }
        },

        // -- Stacks ------------------------------------------------------------------
        __stackOpen: (_name: string, mode: string): void => {
            activeStack = { name: _name, mode, capture: '' };
        },
        __stackClose: (): void => {
            if (!activeStack) return;
            const content = activeStack.capture;
            const list = views.get(activeStack.name) || [];
            if (activeStack.mode === 'prepend') list.unshift(content);
            else list.push(content);
            views.set(activeStack.name, list);
            activeStack = null;
        },
        __hasStack: (name: string): boolean => (views.get(name) || []).length > 0,
        stacks: views,

        // -- Once ------------------------------------------------------------------------
        __onceSeen: new Set(),
        __onceBegin(id: string): boolean {
            if (helpers.__onceSeen.has(id)) return false;
            helpers.__onceSeen.add(id);
            return true;
        },
        __onceEnd() {},
        __viewName: (): string => options.viewName || '',

        // -- Sections ---------------------------------------------------------------------
        __extendsView: (view: string) => options.setExtends(view),
        __sectionStart(name: string): void {
            lastSectionName = name;
            sectionStack.push({ name, capture: '', overwrite: false });
        },
        __sectionStore(): void {
            const frame = sectionStack.pop();
            if (!frame) return;
            sections.set(frame.name, frame.content);
            options.onSection && options.onSection(frame.name, frame.content);
        },
        __sectionOverwrite(): void {
            if (sectionStack.length) sectionStack[sectionStack.length - 1].overwrite = true;
        },
        __sectionShow(): void {
            // @show ends the section AND echoes it immediately.
            const frame = sectionStack.pop();
            if (!frame) return;
            sections.set(frame.name, frame.content);
            options.onSection && options.onSection(frame.name, frame.content);
            output(frame.content, { raw: true });
        },
        __yieldSection(name: string, fallback?: unknown): string {
            if (sections.has(name)) return sections.get(name) as string;
            if (fallback !== undefined && fallback !== null) return String(fallback);
            return '';
        },
        __hasSection: (name: string): boolean => sections.has(name),
        __sectionInline(name: string, content: unknown): void {
            // `@section('name', 'content')` — inline form. @parent placeholder
            // resolves to any previously captured content for this section.
            const previous = sections.has(name) ? (sections.get(name) as string) : '';
            sections.set(
                name,
                String(content).replace(/@parent/g, () => previous)
            );
            options.onSection && options.onSection(name, sections.get(name) as string);
        },
        __sectionParent(): string {
            const name = sectionStack.length
                ? sectionStack[sectionStack.length - 1].name
                : lastSectionName;
            return name && sections.has(name) ? (sections.get(name) as string) : '';
        },
        sections,

        // -- Fragments -----------------------------------------------------------------------
        __fragmentStart(name: string): void {
            currentFragment = name;
        },
        __fragmentStop(): void {
            currentFragment = null;
        },
        fragments,
        hasFragments: (): boolean => Object.keys(fragments).length > 0,
        fragmentContent: (name: string): string => fragments[name],

        // -- Switch -----------------------------------------------------------------------------
        get __switchValue(): any {
            return switchValue;
        },
        set __switchValue(v: any) {
            switchValue = v;
        },
        get __switchMatched(): boolean {
            return switchState.matched;
        },
        set __switchMatched(v: boolean) {
            switchState.matched = v;
        },

        // -- Forms / errors / auth ------------------------------------------------------------
        csrfToken: (): string => (env.csrfToken ? env.csrfToken() : ''),
        errors: (): any =>
            env.errors
                ? env.errors()
                : {
                      anyOf: () => false,
                      hasAny: () => false,
                      firstOf: () => undefined,
                  },
        guardCheck: (...args: unknown[]): boolean => (env.authCheck ? env.authCheck(...args) : false),

        truthyAttr: (attr: string, condition: unknown): string => (condition ? ` ${attr}` : ''),
        conditionalClass(list: any): string {
            const classes: string[] = [];
            for (const [key, val] of entries(list)) {
                if (typeof key === 'number') classes.push(String(val ?? key));
                else if (val) classes.push(String(key));
            }
            const joined = classes.join(' ').trim().replace(/\s+/g, ' ');
            return joined ? ` class="${escapeHtml(joined)}"` : '';
        },
        conditionalStyle(list: any): string {
            const styles: string[] = [];
            for (const [key, val] of entries(list)) {
                if (val) styles.push(String(key));
            }
            const joined = styles.join('; ');
            return joined ? ` style="${escapeHtml(joined)}"` : '';
        },

        app: () => env.app,

        __useImport: async (path: string): Promise<void> => {
            if (env.importClass) await env.importClass(path);
        },

        __captureOutput: async (fn: () => unknown): Promise<string> => {
            const prevOutput = env.output;
            const chunks: string[] = [];
            env.output = (chunk: unknown, opts: OutputOptions = {}) =>
                chunks.push(opts.raw ? String(chunk) : escapeHtml(String(chunk ?? '')));
            try {
                await fn();
            } finally {
                env.output = prevOutput;
            }
            return chunks.join('');
        },
    };

    return {
        data,
        extra: {},
        helpers,
        views,
        BreakSignal,
    };
}

module.exports = { createRuntime };
