'use strict';

const compilerModule = require('./compiler');

export {};

/** Options bag forwarded to the compiler / render runtime (see compiler/runtime). */
interface RenderOptions {
    env?: Record<string, any>;
    sections?: Map<string, string>;
    viewName?: string;
    [key: string]: unknown;
}

/**
 * Compile a Blade template string to a JavaScript function body.
 */
exports.compile = (template: string): string => new compilerModule.Compiler().compileString(template);

/**
 * Render a Blade template string with the given data.
 */
exports.render = (
    template: string,
    data: Record<string, unknown> = {},
    options: RenderOptions = {}
) => require('./compiler').render(template, data, options);

/**
 * The Blade compiler class.
 */
exports.Compiler = compilerModule.Compiler;

/**
 * Escape a value for HTML output.
 */
exports.escape = require('./compiler/escape');

/**
 * Register custom directives / conditionals on the shared compiler.
 *
 * `directive(name, handler)` — handler receives the raw argument string and
 * returns JavaScript source.
 * `ifDirective(name, handler)` — handler receives evaluated arguments at
 * render time and returns a boolean.
 */
exports.directive = compilerModule.directive;
exports.if = compilerModule.ifDirective;

// Re-point module.exports at the populated object: the `export {}` above makes
// bundlers seed a fresh namespace before these assignments run.
module.exports = exports;
