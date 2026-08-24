#!/usr/bin/env node
/**
 * The Nodevel Artisan CLI.
 *
 * Usage: node artisan <command> [arguments]
 */
'use strict';

process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error(reason && reason.stack ? reason.stack : reason);
    process.exitCode = 1;
});

const { resolve } = require('path');

// The application root is always the directory containing the `artisan`
// executable that was invoked — mirroring Laravel's behaviour.
const basePath = resolve(__dirname, '..');

const { handleCommand } = require('@nodevel/framework/src/Foundation/start');

handleCommand(basePath, process.argv.slice(2)).then((code) => {
    if (typeof code === 'number') process.exit(code);
}).catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e && e.stack ? e.stack : e);
    process.exit(1);
});
