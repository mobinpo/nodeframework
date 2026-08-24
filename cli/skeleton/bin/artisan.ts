#!/usr/bin/env node
/**
 * The Nodevel Artisan CLI.
 *
 * Usage: node artisan <command> [arguments]
 */
'use strict';

process.on('unhandledRejection', (reason: unknown) => {
    // eslint-disable-next-line no-console
    const err = reason as { stack?: string } | null | undefined;
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
});

const { resolve } = require('path');

// The application root is always the directory containing the `artisan`
// executable that was invoked — mirroring Laravel's behaviour.
const basePath = resolve(__dirname, '..');

const { handleCommand } = require('@nodevel/framework/src/Foundation/start') as {
    handleCommand: (basePath: string, argv: string[]) => Promise<number | void>;
};

handleCommand(basePath, process.argv.slice(2)).then((code) => {
    if (typeof code === 'number') process.exit(code);
}).catch((e: unknown) => {
    // eslint-disable-next-line no-console
    const err = e as { stack?: string } | null | undefined;
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});

export {};
