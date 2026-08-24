'use strict';

const Command = require('../Command') as new (app: any) => any;

export {};

interface RouteListRow {
    method: string;
    uri: string;
    name: string;
    action: string;
    middleware: string;
}

class RouteListCommand extends Command {
    static signature =
        'route:list {--method= : Filter by HTTP method} {--name= : Filter by route name} {--path= : Only show routes matching the path prefix} {--except-vendor : Hide vendor routes} {--only-vendor} {--json : Output as JSON}';
    static description = 'List all registered routes';

    async handle(): Promise<any> {
        const router = this.app.make('router');
        const rows: RouteListRow[] = [];

        for (const route of router.getRoutes()) {
            const action =
                Array.isArray(route.action)
                    ? `${route.action[0].name}@${route.action[1]}`
                    : typeof route.action === 'function'
                        ? (route.action.name || 'Closure')
                        : String(route.action);

            if (this.option('path') && !route.uri.startsWith(this.option('path'))) continue;
            if (this.option('name') && route.getName() !== this.option('name')) continue;
            if (this.option('method') && !route.methods.includes(this.option('method').toUpperCase())) continue;

            rows.push({
                method: route.methods.join('|'),
                uri: route.uri,
                name: route.getName() || '',
                action,
                middleware: route.middlewareList.join(','),
            });
        }

        if (this.option('json')) {
            // eslint-disable-next-line no-console
            console.log(JSON.stringify(rows, null, 2));
            return;
        }

        this.table(
            ['Method', 'URI', 'Name', 'Action', 'Middleware'],
            rows.map((r) => [r.method, r.uri, r.name, r.action, r.middleware])
        );
    }
}

module.exports = { default: RouteListCommand, RouteList: RouteListCommand };
