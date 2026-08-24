'use strict';

const { Compiler, translateExpression } = require('./compiler');
const registry = require('./registry');
const escapeHtml = require('./escape');

export {};

interface OutputOptions {
    raw?: boolean;
}

/**
 * Environment callbacks supplied by the framework's view factory
 * (see `createRuntime` in ./runtime).
 */
interface RenderEnv {
    output(chunk: unknown, opts?: OutputOptions): void;
    include(view: string, data?: Record<string, unknown>, opts?: Record<string, unknown>): unknown;
    exists(view: string): unknown;
    csrfToken?: () => string;
    errors?: () => any;
    authCheck?: (...args: unknown[]) => boolean;
    app?: any;
    importClass?: (path: string) => unknown;
}

interface RenderOptions extends Partial<RenderEnv> {
    sections?: Map<string, string>;
    viewName?: string;
    renderComponent?: (
        name: string,
        attributes: Record<string, unknown>,
        slot: string,
        slots: Record<string, unknown>
    ) => Promise<void> | void;
    setExtends?(view: string): void;
    onSection?(name: string, content: string): void;
}

/** Scope object built per render (see `createRuntime` in ./runtime). */
interface RenderScope {
    data: Record<string, unknown>;
    extra: Record<string, unknown>;
    helpers: Record<string, any>;
    views: Map<string, string[]>;
    BreakSignal: new () => Error;
}

/**
 * Compile a Blade template string into a JavaScript function body.
 */
exports.compile = (template: string): string => new Compiler().compileString(template);

/**
 * Render a Blade template string with the given data.
 *
 * `options.env` provides the render environment:
 *   - output(chunk, { raw })   — emit rendered content
 *   - include(view, data)      — render another view
 *   - exists(view)             — view existence check
 *   - csrfToken / errors / authCheck — form + auth helpers
 */
async function render(
    template: string,
    data: Record<string, unknown> = {},
    options: RenderOptions = {}
): Promise<RenderScope> {
    const body = new Compiler(options).compileString(template);
    const { createRuntime } = require('./runtime');
    const scope = createRuntime(data, options);

    // De-duplicate helper names; `__output` is passed separately so it is
    // excluded from the spread.
    const helperNames = [...new Set(Object.keys(scope.helpers))].filter(
        (n) => n !== '__output'
    );
    const fn = new Function(
        '__output',
        'scope',
        ...helperNames,
        `const { data } = scope; with (data) { with (scope.extra) { ${body} } }`
    );

    fn(
        scope.helpers.__output,
        scope,
        ...helperNames.map((n) => scope.helpers[n])
    );

    return scope;
}

module.exports = {
    Compiler,
    compile: (t: string) => new Compiler().compileString(t),
    render,
    translateExpression,
    escape: escapeHtml,
    directive: registry.directive,
    ifDirective: registry.if,
};
