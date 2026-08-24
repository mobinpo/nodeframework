'use strict';

export {};

/**
 * Shared directive registry for the Blade compiler.
 *
 * Custom directives registered via `Blade::directive` equivalents receive the
 * raw argument string and must return JavaScript source to be emitted.
 * Custom conditionals (`Blade::if`) receive evaluated arguments at render
 * time and return a boolean (or promise of one).
 */

/** Handler for a custom directive: raw argument string in, JavaScript source out. */
type CustomDirectiveHandler = (rawArgs: string) => string;

/** Handler for a custom conditional (`Blade::if`): evaluated arguments in, boolean (or promise of one) out. */
type CustomIfHandler = (...args: unknown[]) => boolean | Promise<boolean>;

const customDirectives = new Map<string, CustomDirectiveHandler>();
const customIfs = new Map<string, CustomIfHandler>();

function directive(name: string, handler: CustomDirectiveHandler): void {
    customDirectives.set(name.toLowerCase(), handler);
}

function ifDirective(name: string, handler: CustomIfHandler): void {
    customIfs.set(name, handler);
}

exports.directive = directive;
exports.if = ifDirective;
exports.getDirective = (name: string): CustomDirectiveHandler | undefined => customDirectives.get(name.toLowerCase());
exports.customDirectives = customDirectives;
exports.customIfs = customIfs;

// Re-point module.exports at the populated object: the `export {}` above makes
// bundlers seed a fresh namespace before these assignments run.
module.exports = exports;
