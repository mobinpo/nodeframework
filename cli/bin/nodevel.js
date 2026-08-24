#!/usr/bin/env node
'use strict';

/**
 * The Nodevel CLI — the equivalent of Laravel's `laravel` installer.
 *
 *   npm i -g @nodevel/cli
 *   nodevel new <project-name>
 */

const path = require('path');

function pkg() {
    return require('../package.json');
}

function printHelp() {
    const p = pkg();
    console.log(`
  ${p.name} ${p.version}

  Usage:
    nodevel new <project-name> [options]    Create a new Nodevel application

  Options:
    --force            Overwrite the target directory if it exists
    --skip-install     Skip installing npm dependencies
    -h, --help         Display this help message
    -V, --version      Display the CLI version

  After creating an application:

    cd <project-name>
    npm run dev
`);
}

async function main(argv) {
    const [command, ...rest] = argv;

    if (!command || command === '-h' || command === '--help' || command === 'help') {
        printHelp();
        return 0;
    }

    if (command === '-V' || command === '--version' || command === 'version') {
        console.log(pkg().version);
        return 0;
    }

    if (command !== 'new') {
        console.error(`\n  Unknown command "${command}". Did you mean "nodevel new <project-name>"?\n`);
        return 1;
    }

    const name = rest.find((a) => !a.startsWith('-'));
    if (!name) {
        console.error('\n  Please provide a project name: nodevel new <project-name>\n');
        return 1;
    }

    const options = {
        force: rest.includes('--force'),
        skipInstall: rest.includes('--skip-install'),
    };

    // Lazily require so that --help/--version stay fast.
    const { newProject } = require('../lib/new');

    return newProject(name, {
        ...options,
        skeletonDir: path.join(__dirname, '..', 'skeleton'),
        cliVersion: pkg().version,
    });
}

main(process.argv.slice(2))
    .then((code) => {
        if (typeof code === 'number' && code !== 0) process.exitCode = code;
    })
    .catch((err) => {
        console.error(`\n  ${err && err.message ? err.message : err}\n`);
        process.exitCode = 1;
    });
