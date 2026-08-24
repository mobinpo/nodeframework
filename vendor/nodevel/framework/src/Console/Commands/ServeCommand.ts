'use strict';

const Command = require('../Command') as new (app: any) => any;
const { handleRequestServer } = require('../../Foundation/start');

export {};

class ServeCommand extends Command {
    static signature = 'serve {--port= : The port to serve the application on}';
    static description = 'Start the Nodevel development server';

    async handle(): Promise<any> {
        const port = this.option('port') ? Number(this.option('port')) : null;
        const server = await handleRequestServer(this.app.basePath_, port);

        const shutdown = () => {
            server.close(() => process.exit(0));
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        // Keep the command running until the server is stopped, mirroring
        // how `php artisan serve` blocks for the lifetime of the process.
        await new Promise(() => {});
    }
}

module.exports = { default: ServeCommand, Serve: ServeCommand };
