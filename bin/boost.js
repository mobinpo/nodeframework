#!/usr/bin/env node
'use strict';

/**
 * Nodevel Boost — a local MCP (Model Context Protocol) stdio server that
 * gives AI agents deep knowledge of your Nodevel application.
 *
 * ponytail: implements the core MCP surface (initialize, tools/list,
 * tools/call) over line-delimited JSON-RPC on stdio; add SSE/streamable
 * HTTP transport when remote clients are needed.
 */

const fs = require('fs');
const path = require('path');

const TOOLS = [
    {
        name: 'application-info',
        description: 'Get essential information about the Nodevel application (version, environment, drivers).',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'route-list',
        description: 'List all registered routes with methods, URIs, names, and actions.',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'database-schema',
        description: 'Get the database schema: tables with their columns.',
        inputSchema: {
            type: 'object',
            properties: { table: { type: 'string', description: 'Optional single table name.' } },
        },
    },
    {
        name: 'search-docs',
        description: 'Full-text search across the versioned Nodevel documentation.',
        inputSchema: {
            type: 'object',
            properties: { query: { type: 'string', description: 'The search term.' } },
            required: ['query'],
        },
    },
    {
        name: 'last-error',
        description: 'Read the most recent exception from the application log.',
        inputSchema: { type: 'object', properties: {} },
    },
];

// -- Tool implementations --------------------------------------------------------

function readJsonSafe(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

function toolApplicationInfo(basePath) {
    const pkg = readJsonSafe(path.join(basePath, 'package.json')) || {};
    const env = readJsonSafe(path.join(basePath, '.env'));
    const routesDir = path.join(basePath, 'routes');
    const routeFiles = fs.existsSync(routesDir) ? fs.readdirSync(routesDir).filter((f) => f.endsWith('.js')) : [];
    const modelsDir = path.join(basePath, 'app', 'Models');
    const models = fs.existsSync(modelsDir)
        ? fs.readdirSync(modelsDir).filter((f) => f.endsWith('.js')).map((f) => path.basename(f, '.js'))
        : [];

    return {
        application_name: env?.APP_NAME || pkg.name || 'Nodevel',
        environment: process.env.APP_ENV || env?.APP_ENV || 'local',
        framework_version: pkg.dependencies?.['@nodevel/framework'] || 'file:vendor/nodevel/framework',
        node_version: process.version,
        database_driver: env?.DB_CONNECTION || 'sqlite',
        cache_store: env?.CACHE_STORE || 'file',
        queue_connection: env?.QUEUE_CONNECTION || 'sync',
        session_driver: env?.SESSION_DRIVER || 'file',
        mail_mailer: env?.MAIL_MAILER || 'log',
        route_files: routeFiles,
        models,
    };
}

function bootAppForTools(basePath) {
    // Boot lazily and cache; container-backed tools share this instance.
    if (!global.__NODEVEL_BOOST_APP_PROMISE) {
        global.__NODEVEL_BOOST_APP_PROMISE = (async () => {
            const { bootApp } = require(path.join(
                basePath,
                'vendor',
                'nodevel',
                'framework',
                'src',
                'Foundation',
                'Testing',
                'TestCase'
            ));
            return bootApp(basePath);
        })();
    }
    return global.__NODEVEL_BOOST_APP_PROMISE;
}

async function toolRouteList(basePath) {
    const app = await bootAppForTools(basePath);
    return app.make('router').getRoutes().map((route) => ({
        method: Array.isArray(route.method) ? route.method.join('|') : route.method,
        uri: route.uri(),
        name: route.getName(),
        action: typeof route.action === 'string' ? route.action : '(closure)',
        middleware: route.gatheredMiddleware ? route.gatheredMiddleware() : [],
    }));
}

async function toolDatabaseSchema(basePath, args) {
    const app = await bootAppForTools(basePath);
    const connection = app.make('db').connection();
    const wanted = args.table || null;
    const tables = (await connection.tables()).filter((t) => !wanted || t === wanted);
    const schema = {};
    for (const table of tables) {
        let columns = [];
        try {
            columns = await connection.select(`PRAGMA table_info("${table}")`);
        } catch {
            columns = await connection.select(
                `SELECT column_name AS name, data_type AS type FROM information_schema.columns WHERE table_name = '${String(table).replace(/'/g, "''")}'`
            );
        }
        schema[table] = columns.map((c) => ({ name: c.name ?? c.cid, type: c.type ?? '' }));
    }
    return schema;
}

function toolSearchDocs(basePath, args) {
    const needle = String(args.query || '').toLowerCase();
    if (!needle) throw new Error('A non-empty query is required.');
    const docsDir = path.join(basePath, 'docs');
    const results = [];
    for (const file of fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'))) {
        const lines = fs.readFileSync(path.join(docsDir, file), 'utf8').split('\n');
        for (let i = 0; i < lines.length && results.length < 50; i++) {
            if (lines[i].toLowerCase().includes(needle)) {
                results.push({ page: path.basename(file, '.md'), line: i + 1, text: lines[i].trim().slice(0, 200) });
            }
        }
        if (results.length >= 50) break;
    }
    return { total_results: results.length, results };
}

function toolLastError(basePath) {
    const logDir = path.join(basePath, 'storage', 'logs');
    if (!fs.existsSync(logDir)) return { error: 'No logs directory found.' };
    const newest = fs
        .readdirSync(logDir)
        .filter((f) => f.endsWith('.log'))
        .map((f) => path.join(logDir, f))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    if (!newest) return { error: 'No log files found.' };
    return { file: path.basename(newest), tail: fs.readFileSync(newest, 'utf8').slice(-4000) };
}

async function callTool(name, args = {}, basePath) {
    switch (name) {
        case 'application-info': return toolApplicationInfo(basePath);
        case 'route-list': return toolRouteList(basePath);
        case 'database-schema': return toolDatabaseSchema(basePath, args);
        case 'search-docs': return toolSearchDocs(basePath, args);
        case 'last-error': return toolLastError(basePath);
        default: throw new Error(`Unknown tool: ${name}`);
    }
}

// -- MCP stdio loop -----------------------------------------------------------------

function respond(id, result) {
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

function respondError(id, code, message) {
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);
}

function handleMessage(line, basePath) {
    let message;
    try {
        message = JSON.parse(line);
    } catch {
        return respondError(null, -32700, 'Parse error');
    }

    const { id, method, params } = message;
    switch (method) {
        case 'initialize':
            respond(id, {
                protocolVersion: (params && params.protocolVersion) || '2024-11-05',
                capabilities: { tools: {} },
                serverInfo: { name: 'nodevel-boost', version: '1.0.0' },
            });
            break;
        case 'notifications/initialized':
            break;
        case 'tools/list':
            respond(id, { tools: TOOLS });
            break;
        case 'tools/call':
            Promise.resolve()
                .then(() => callTool(params.name, params.arguments || {}, basePath))
                .then((result) => respond(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }))
                .catch((error) => respondError(id, -32000, error.message));
            break;
        case 'ping':
            respond(id, {});
            break;
        default:
            if (id !== undefined) respondError(id, -32601, `Method not found: ${method}`);
    }
}

function runMcpServer(basePath) {
    let buffer = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
        buffer += chunk;
        let index;
        while ((index = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, index).trim();
            buffer = buffer.slice(index + 1);
            if (line) handleMessage(line, basePath);
        }
    });
    process.stdin.on('end', () => process.exit(0));
}

// -- CLI entrypoints ------------------------------------------------------------------

function main() {
    const basePath = path.resolve(__dirname, '..');
    const [command] = process.argv.slice(2);

    if (command === 'mcp') {
        runMcpServer(basePath);
        return;
    }

    if (command === 'list-tools') {
        console.log(TOOLS.map((t) => `${t.name.padEnd(20)} ${t.description}`).join('\n'));
        return;
    }

    // Default: `install` — wire the server into .mcp.json for local agents.
    const mcpFile = path.join(basePath, '.mcp.json');
    const config = readJsonSafe(mcpFile) || { mcpServers: {} };
    config.mcpServers = config.mcpServers || {};
    config.mcpServers.nodevel = { command: 'node', args: ['bin/boost.js', 'mcp'] };
    fs.writeFileSync(mcpFile, `${JSON.stringify(config, null, 4)}\n`);
    console.log('Nodevel Boost installed to [.mcp.json]. Agents can start it via `node bin/boost.js mcp`.');
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

module.exports = { callTool, TOOLS, runMcpServer };
