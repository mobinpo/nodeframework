'use strict';

/**
 * The console / HTTP bootstrap entry — the equivalent of
 * `Illuminate\Foundation\...` boot plus `artisan` dispatch.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');

const Application = require('./Application');
const { HttpKernel } = require('./HttpKernel');

import type { Server } from 'http';

export {};

/**
 * Resolve an app-layer file that may exist as either TypeScript or
 * JavaScript (e.g. `bootstrap/providers.ts` vs `providers.js`).
 */
function resolveAppFile(basePath: string, ...segments: string[]): string | null {
    for (const ext of ['.ts', '.js']) {
        const candidate = path.join(basePath, ...segments) + ext;
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

/**
 * Boot the application for console use and run the given argv.
 */
async function handleCommand(basePath: string, argv: string[]): Promise<number> {
    const app = new Application(basePath);

    // Run the application bootstrap (middleware + aliases).
    app.withBootstrap();

    // Register application providers.
    const providersFile = resolveAppFile(basePath, 'bootstrap', 'providers');
    if (providersFile) {
        const providerClasses = require(providersFile);
        await app.bootWithProviders(providerClasses);
    } else {
        await app.bootWithProviders([]);
    }

    // Discover commands.
    const artisan = app.make('artisan');
    artisan.discoverFromDirectory(path.join(__dirname, '..', 'Console', 'Commands'));
    artisan.discoverFromDirectory(app.appPath('Console', 'Commands'));

    // Console routes (closure commands + scheduling).
    const consoleRoutes = resolveAppFile(basePath, 'routes', 'console');
    if (consoleRoutes) {
        require(consoleRoutes)(app);
    }

    return artisan.run(argv);
}

/**
 * Boot the application and start the HTTP server.
 * Returns the Node server.
 */
async function handleRequestServer(basePath: string, port: number | null = null): Promise<Server> {
    const app = new Application(basePath);

    // Run the application bootstrap (middleware + aliases).
    app.withBootstrap();

    const providersFile = resolveAppFile(basePath, 'bootstrap', 'providers');
    if (providersFile) {
        await app.bootWithProviders(require(providersFile));
    } else {
        await app.bootWithProviders([]);
    }

    const kernel = new HttpKernel(app);
    const listenPort =
        port || Number(process.env.APP_PORT || app.config('app.port') || 8000);

    const server = http.createServer((nodeReq: any, nodeRes: any) => {
        kernel.handleRequest(nodeReq, nodeRes).catch((error: any) => {
            nodeRes.writeHead(500, { 'content-type': 'text/plain' });
            nodeRes.end(String(error?.stack || error));
        });
    });

    await new Promise((resolvePromise) => server.listen(listenPort, resolvePromise));
    // eslint-disable-next-line no-console
    console.log(`Server running at [http://127.0.0.1:${listenPort}].`);
    // eslint-disable-next-line no-console
    console.log('Press Ctrl+C to stop the server.');

    return server;
}

module.exports = { handleCommand, handleRequestServer };
