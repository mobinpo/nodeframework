'use strict';

const fs = require('fs');
const path = require('path');

const BladeCompiler = require('@nodevel/blade/compiler').Compiler;
const { createRuntime } = require('@nodevel/blade/compiler/runtime');
const Str = require('../Support/Str');

export {};

/** Evaluate a component attribute expression against the parent view data. */
function evaluateInData(expression: string, data: Record<string, any> | null | undefined): any {
    const keys = Object.keys(data || {});
    // eslint-disable-next-line no-new-func
    const fn = new Function(
        ...keys,
        `"use strict"; return (${expression});`
    );
    try {
        return fn(...keys.map((k) => data![k]));
    } catch (error) {
        throw new Error(`Unable to evaluate component attribute [${expression}]: ${(error as Error).message}`);
    }
}

/**
 * The `$attributes` bag inside component views — `Illuminate\View\ComponentAttributeBag`.
 */
class ComponentAttributes {
    entries_: [string, any][];

    constructor(entries: [string, any][] = []) {
        this.entries_ = entries;
    }

    /** Merge defaults; later values win for plain attrs, class/style append. */
    merge(defaults: Record<string, any>): ComponentAttributes {
        const merged = new Map(this.entries_);
        for (const [key, value] of Object.entries(defaults)) {
            if (merged.has(key) && (key === 'class' || key === 'style')) {
                merged.set(key, `${merged.get(key)} ${value}`.trim());
            } else {
                merged.set(key, value);
            }
        }
        return new ComponentAttributes([...merged.entries()]);
    }

    get(key: string, fallback: any = null): any {
        for (const [k, v] of this.entries_) {
            if (k === key) return v;
        }
        return fallback;
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    except(keys: string | string[]): ComponentAttributes {
        const excluded = new Set(Array.isArray(keys) ? keys : [keys]);
        return new ComponentAttributes(this.entries_.filter(([k]) => !excluded.has(k)));
    }

    only(keys: string | string[]): ComponentAttributes {
        const wanted = new Set(Array.isArray(keys) ? keys : [keys]);
        return new ComponentAttributes(this.entries_.filter(([k]) => wanted.has(k)));
    }

    /** Render as `key="value"` pairs. */
    toHtml(): string {
        return this.entries_
            .map(([k, v]) => (v === true ? ` ${Str.kebab(k)}` : v === false || v == null ? '' : ` ${Str.kebab(k)}="${String(v).replace(/"/g, '&quot;')}"`))
            .join('');
    }

    toString(): string {
        return this.toHtml();
    }

    *[Symbol.iterator](): Generator<[string, any]> {
        yield* this.entries_;
    }
}


/**
 * The view factory — the equivalent of `Illuminate\View\Factory`.
 *
 * Compiles `.blade.js` templates (Blade syntax with JavaScript expressions)
 * from `resources/views`, caches compiled output, supports sections,
 * layouts, stacks, composers, and fragments.
 */

interface ComposerHandler {
    (instance: any): any;
    compose?: (instance: any) => any;
}

interface ViewInstance {
    view_: string;
    data: Record<string, any>;
}

interface CompiledView {
    mtime: number;
    body: string;
}

interface ResolvedComponent {
    type: 'class' | 'anonymous';
    ctor?: any;
    viewName: string;
}

class Factory {
    declare syncResults: Map<string, string>;

    app: any;
    sharedData: Record<string, any>;
    composers: Map<string, ComposerHandler[]>;
    creators: Map<string, ComposerHandler[]>;
    compiler: any;
    compiledCache: Map<string, CompiledView>;
    rendering: string[];

    constructor(app: any) {
        this.app = app;
        this.sharedData = {};
        this.composers = new Map(); // view name or '*' -> [{ handler }]
        this.creators = new Map();
        this.compiler = new BladeCompiler();
        this.compiledCache = new Map(); // view name -> { mtime, body }
        this.rendering = [];
    }

    /** Determine if a view exists. */
    exists(name: string): boolean {
        return fs.existsSync(this.findPath(name));
    }

    findPath(name: string): string {
        const viewsDir = this.app.resourcePath('views');
        const candidates = [
            path.join(viewsDir, `${name.replace(/\./g, '/')}.blade.js`),
            path.join(viewsDir, `${name}.blade.js`),
            path.join(viewsDir, `${name.replace(/\./g, '/')}.js`),
        ];
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
        }
        throw new Error(`View [${name}] not found. Searched in ${viewsDir}.`);
    }

    /**
     * Resolve a component name (`alert`, `forms.input`) to its class module or
     * anonymous view. Mirrors Laravel's component resolution: class components
     * live in `app/View/Components`, anonymous ones in
     * `resources/views/components`.
     */
    resolveComponent(name: string): ResolvedComponent {
        const segments = String(name).split('.');
        const pascal = segments.map((s) => Str.pascal(s)).join('/');
        const kebab = segments.map((s) => Str.kebab(s)).join('/');

        const classFile = this.app.appPath('View', 'Components', `${pascal}.js`);
        if (fs.existsSync(classFile)) {
            const mod = require(classFile);
            return { type: 'class', ctor: mod.default || mod, viewName: `components/${kebab}` };
        }

        const anonymousView = `components/${kebab}`;
        if (this.exists(anonymousView)) {
            return { type: 'anonymous', viewName: anonymousView };
        }

        throw new Error(`Unable to locate component [${name}].`);
    }

    /**
     * Render an `<x-...>` component. `slot` is the default slot's captured
     * HTML; `slots` maps named slots to `{ content, attributes }`.
     */
    async renderComponent(name: string, attributes: Record<string, any> | undefined, slot: string | undefined, slots: Record<string, { content: any; attributes: Record<string, any> }> | undefined, parentData: Record<string, any> = {}): Promise<string> {
        const resolved = this.resolveComponent(name);

        // Evaluate slot attribute expressions against the current data.
        const evaluatedAttrs: Record<string, any> = {};
        for (const [key, value] of Object.entries(attributes || {})) {
            evaluatedAttrs[Str.camel(key)] =
                value && typeof value === 'object' && value.expr !== undefined
                    ? evaluateInData(value.expr, parentData)
                    : value;
        }
        for (const [key, meta] of Object.entries(slots || {})) {
            for (const [ak, av] of Object.entries(meta.attributes || {})) {
                if (av && typeof av === 'object' && av.expr !== undefined) {
                    meta.attributes[ak] = evaluateInData(av.expr, parentData);
                }
            }
        }

        const attributesClass = new Map(Object.entries(evaluatedAttrs));

        if (resolved.type === 'class') {
            const ComponentClass = resolved.ctor;
            const instance =
                typeof ComponentClass === 'function' && ComponentClass.prototype
                    ? new ComponentClass({ ...evaluatedAttrs })
                    : null;
            if (!instance) throw new Error(`Component [${name}] must be a class.`);

            const props = Array.isArray(ComponentClass.props) ? ComponentClass.props : [];
            const data: Record<string, any> = {};
            for (const prop of props) {
                if (prop in evaluatedAttrs) data[prop] = evaluatedAttrs[prop];
            }
            if (typeof instance.data === 'function') {
                Object.assign(data, await instance.data());
            }
            data.$attributes = new ComponentAttributes(
                [...attributesClass.entries()].filter(([k]) => !props.includes(k))
            );
            data.$slot = slot;
            for (const [slotKey, meta] of Object.entries(slots || {})) {
                data[`$slot_${slotKey}`] = meta.content;
                data[`${slotKey}Slot`] = meta.content;
            }
            return this.renderString(
                await fs.promises.readFile(this.findPath(resolved.viewName), 'utf8'),
                data
            );
        }

        // Anonymous component.
        const data = {
            ...parentData,
            ...evaluatedAttrs,
            $attributes: new ComponentAttributes([...attributesClass.entries()]),
            $slot: slot,
        };
        for (const [slotKey, meta] of Object.entries(slots || {})) {
            data[slotKey] = meta.content;
            data[`$slot_${slotKey}`] = meta.content;
        }
        return this.renderString(
            await fs.promises.readFile(this.findPath(resolved.viewName), 'utf8'),
            data
        );
    }


    /**
     * Create a view instance.
     */
    async make(name: string, data: Record<string, any> = {}, mergeData: Record<string, any> = {}): Promise<any> {
        const viewPath = this.findPath(name);
        const view = require('./View');
        const instance = new view(this, name, viewPath, {
            ...this.sharedData,
            ...data,
            ...mergeData,
        });

        // Run creators immediately after instantiation.
        for (const creator of this.matchingHandlers(name, this.creators)) {
            await creator(instance);
        }

        // Run composers just before rendering.
        for (const composer of this.matchingHandlers(name, this.composers)) {
            await composer.compose ? (composer.compose as (i: any) => any)(instance) : composer(instance);
        }

        return instance;
    }

    /** First existing view in a list — `View::first([...])`. */
    async first(names: string[], data: Record<string, any> = {}): Promise<any> {
        for (const name of names) {
            if (this.exists(name)) return this.make(name, data);
        }
        throw new Error(`None of the views exist: ${names.join(', ')}`);
    }

    matchingHandlers(name: string, registry: Map<string, ComposerHandler[]>): ComposerHandler[] {
        const handlers: ComposerHandler[] = [];
        for (const [pattern, list] of registry) {
            if (pattern === name || pattern === '*') handlers.push(...list);
            else if (typeof pattern === 'string' && pattern.endsWith('*') && name.startsWith(pattern.slice(0, -1))) {
                handlers.push(...list);
            }
        }
        return handlers;
    }

    /** Share data with all views. */
    share(keyOrData: Record<string, any> | string, value: any = undefined): Factory {
        if (typeof keyOrData === 'object') Object.assign(this.sharedData, keyOrData);
        else this.sharedData[keyOrData] = value;
        return this;
    }

    composer(views: string | string[], callback: ComposerHandler): Factory {
        for (const view of Array.isArray(views) ? views : [views]) {
            const list = this.composers.get(view) || [];
            list.push(callback);
            this.composers.set(view, list);
        }
        return this;
    }

    creator(views: string | string[], callback: ComposerHandler): Factory {
        for (const view of Array.isArray(views) ? views : [views]) {
            const list = this.creators.get(view) || [];
            list.push(callback);
            this.creators.set(view, list);
        }
        return this;
    }

    // -- Compilation -----------------------------------------------------------

    compile(viewName: string): string {
        const sourcePath = this.findPath(viewName);
        const mtime = fs.statSync(sourcePath).mtimeMs;
        const cached = this.compiledCache.get(viewName);

        if (!cached || cached.mtime !== mtime) {
            const source = fs.readFileSync(sourcePath, 'utf8');
            this.compiledCache.set(viewName, {
                mtime,
                body: this.compiler.compileString(source),
            });
        }
        return this.compiledCache.get(viewName)!.body;
    }

    /** Pre-compile all views — `php artisan view:cache` equivalent. */
    cacheAll(): boolean {
        const viewsDir = this.app.resourcePath('views');
        const walk = (dir: string): void => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (entry.isDirectory()) walk(path.join(dir, entry.name));
                else if (/\.blade\.js$/.test(entry.name)) {
                    const relative = path.relative(viewsDir, dir);
                    const base = entry.name.replace(/\.blade\.js$/, '');
                    this.compile(relative ? `${relative}/${base}` : base);
                }
            }
        };
        if (fs.existsSync(viewsDir)) walk(viewsDir);
        return true;
    }

    clearCache(): void {
        this.compiledCache.clear();
    }

    // -- Rendering ----------------------------------------------------------------

    /**
     * Render a View instance to HTML. Supports template inheritance
     * (`@extends`) by recursively rendering parent layouts.
     */
    async renderAsync(viewInstance: ViewInstance): Promise<string> {
        if (this.rendering.includes(viewInstance.view_)) {
            throw new Error(`Circular view reference detected: ${viewInstance.view_}`);
        }
        this.rendering.push(viewInstance.view_);

        try {
            const body = this.compile(viewInstance.view_);
            const scope = createRuntime(viewInstance.data, {
                viewName: viewInstance.view_,
                sections: new Map(),
                env: {
                    app: this.app,
                    output: () => {},
                    csrfToken: () => this.app.make('session')?.token() || '',
                    errors: () =>
                        this.app.make('request')?.errors || {
                            anyOf: () => false,
                            firstOf: () => undefined,
                        },
                    authCheck: (...args) => {
                        const auth = this.app.make('auth');
                        return args.length ? auth.guard(args[0]).check() : auth.check();
                    },
                },
                include: async (name, dataOverride = {}) =>
                    this.renderString(await fs.promises.readFile(this.findPath(name), 'utf8'), {
                        ...viewInstance.data,
                        ...dataOverride,
                    }),
                exists: (name) => this.exists(name),
                renderComponent: (name, attrs, slot, slots) =>
                    this.renderComponent(name, attrs, slot, slots, viewInstance.data),
                setExtends: null,
                onSection: null,
            });

            // Template inheritance support.
            let extendsView: string | null = null;
            scope.helpers.__extendsView = (view: string) => {
                extendsView = view;
            };
            scope.helpers.setExtends = (v: string) => {
                extendsView = v;
            };

            const chunks: string[] = [];
            const originalOutput = scope.helpers.__output;
            scope.helpers.__output = (chunk: any, opts: { raw?: boolean } = {}) => chunks.push(opts.raw ? String(chunk ?? '') : escape(String(chunk ?? '')));
            void originalOutput;

            await executeBody(body, scope);

            let content = chunks.join('');

            // If the template extends a layout, render the layout with our
            // sections available.
            if (extendsView) {
                const childSections = scope.helpers.sections;
                const layoutScopeData: Record<string, any> = {
                    ...viewInstance.data,
                    ...Object.fromEntries(
                        [...childSections.entries()].map(([k, v]) => [`__section_${k}`, v])
                    ),
                };
                const layoutBody = this.compile(extendsView);
                const layoutScope = createRuntime(layoutScopeData, {
                    viewName: extendsView,
                    sections: childSections,
                    env: scope.helpers.app ? { app: this.app } : {},
                    include: async (name, dataOverride = {}) =>
                        this.renderString(
                            await fs.promises.readFile(this.findPath(name), 'utf8'),
                            { ...layoutScopeData, ...dataOverride }
                        ),
                    exists: (name) => this.exists(name),
                });

                const layoutChunks: string[] = [];
                layoutScope.helpers.__output = (chunk: any, opts: { raw?: boolean } = {}) =>
                    layoutChunks.push(opts.raw ? String(chunk ?? '') : escape(String(chunk ?? '')));

                await executeBody(layoutBody, layoutScope);
                content = layoutChunks.join('');
            }

            // Fragment handling: when fragments were declared and requested,
            // only return those.
            const request = this.app.bound('request') ? this.app.make('request') : null;
            if (scope.helpers.hasFragments() && request?.header?.('hx-request')) {
                const names = Object.keys(scope.helpers.fragments);
                content = names.map((n) => scope.helpers.fragments[n]).join('');
            }

            return content;
        } finally {
            this.rendering.pop();
        }
    }

    /** Synchronous rendering used by View::render(). */
    renderCompiledSync(viewInstance: ViewInstance): string {
        // Rendering is inherently async (includes may load files); provide a
        // deasync-style bridge using Atomics.wait on a worker-free loop is not
        // possible in Node, so we cache pre-rendered results when possible.
        if (this.syncResults.has(viewInstance.view_)) {
            return this.syncResults.get(viewInstance.view_)!;
        }
        throw new Error(
            'Synchronous view rendering requires a pre-rendered result. Use `await view.renderAsync()`.'
        );
    }

    /** Render raw Blade source with data (Blade::render equivalent). */
    async renderString(template: string, data: Record<string, any> = {}): Promise<string> {
        const body = this.compiler.compileString(template);
        const scope = createRuntime(data, {
            env: {
                app: this.app,
                output: () => {},
                csrfToken: () => '',
            },
            include: async () => '',
            exists: async () => false,
        });
        const chunks: string[] = [];
        scope.helpers.__output = (chunk: any, opts: { raw?: boolean } = {}) =>
            chunks.push(opts.raw ? String(chunk ?? '') : escape(String(chunk ?? '')));
        await executeBody(body, scope);
        return chunks.join('');
    }
}

Factory.prototype.syncResults = new Map();

async function executeBody(body: string, scope: any): Promise<void> {
    const helperNames = Object.keys(scope.helpers);
    const fn = new Function(
        '__output',
        'scope',
        ...helperNames,
        `with (scope.data) { with (scope.extra) {\n${body}\n} }`
    );
    await fn(scope.helpers.__output, scope, ...helperNames.map((n) => scope.helpers[n]));
}

function escape(value: any): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

module.exports = Factory;
