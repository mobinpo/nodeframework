'use strict';

const fs = require('fs');
const path = require('path');

const Command = require('../Command') as new (app: any) => any;
const Env = require('../../Support/Env');

export {};

// ---------------------------------------------------------------------------
// about / config / env
// ---------------------------------------------------------------------------

class AboutCommand extends Command {
    static signature = 'about {--only= : Filter the output section}';
    static description = 'Display basic information about your application';

    async handle(): Promise<any> {
        const sections: Record<string, () => any[][]> = {
            environment: () => [
                ['Application name', this.app.config('app.name')],
                ['Environment', this.app.environment()],
                ['Debug mode', Boolean(this.app.config('app.debug')) ? 'ON' : 'OFF'],
                ['URL', this.app.config('app.url')],
                [
                    'Maintenance mode',
                    this.app.isDownForMaintenance() ? 'DOWN' : 'OFF',
                ],
            ],
            cache: () => [
                ['Config', 'NOT CACHED'],
                ['Events', 'NOT CACHED'],
                ['Routes', 'NOT CACHED'],
                ['Views', 'CACHED ON DEMAND'],
            ],
            drivers: () => [
                ['Broadcasting', this.app.config('broadcasting.default', 'null')],
                ['Cache', this.app.config('cache.default')],
                ['Database', this.app.config('database.default')],
                ['Logs', this.app.config('logging.default')],
                ['Mail', this.app.config('mail.default')],
                ['Queue', this.app.config('queue.default')],
                ['Session', this.app.config('session.driver')],
            ],
        };

        const only = this.option('only');
        const keys = only ? Object.keys(sections).filter((k) => k === only) : Object.keys(sections);

        for (const key of keys) {
            this.line(`\n  ${key.toUpperCase()}`);
            for (const [label, value] of sections[key]()) {
                this.line(`    ${label} ................. ${value}`);
            }
        }
        void path;
    }
}

class ConfigShowCommand extends Command {
    static signature = 'config:show {config? : The configuration file to show} {--all : Show every file}';
    static description = 'Print all of the configuration values for a given file';

    async handle(): Promise<any> {
        const repository = this.app.configRepository;

        if (this.option('all') || !this.argument('config')) {
            for (const file of Object.keys(repository.all())) {
                this.showFile(file);
            }
            return;
        }
        this.showFile(this.argument('config'));
    }

    showFile(name: string): void {
        const values = this.app.config(name);
        if (!values || typeof values !== 'object') {
            this.warn(`No configuration file found for [${name}].`);
            return;
        }
        this.line(`\n${name} ................................................................................`);
        this.printValues(values, `  ${name}`);
    }

    printValues(values: any, prefix: string): void {
        for (const [key, value] of Object.entries(values)) {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                this.printValues(value, `${prefix}.${key}`);
            } else {
                this.line(`${prefix}.${key} => ${JSON.stringify(value)}`);
            }
        }
    }
}

class ConfigClearCommand extends Command {
    static signature = 'config:clear';
    static description = 'Remove the configuration cache file';

    async handle(): Promise<any> {
        const file = this.app.bootstrapPath('cache', 'config.js');
        if (fs.existsSync(file)) fs.unlinkSync(file);
        this.info('Configuration cache cleared successfully.');
    }
}

class EnvEncryptCommand extends Command {
    static signature = 'env:encrypt {--key= : The encryption key} {--cipher=AES-256-CBC} {--env= : The environment to encrypt} {--readable}';
    static description = 'Encrypt an environment file';

    async handle(): Promise<any> {
        const environment = this.option('env') || '';
        const source = this.app.basePath(environment ? `.env.${environment}` : '.env');
        const target = this.app.basePath(environment ? `.env.${environment}.encrypted` : '.env.encrypted');

        if (!fs.existsSync(source)) throw new Error(`Environment file not found: ${source}`);

        const EncrypterClass = require('../../Encryption/Encrypter');
        const key = this.option('key') || generateKey();
        const encrypter = new EncrypterClass(key, this.option('cipher'));

        let contents = fs.readFileSync(source, 'utf8');
        if (!this.option('readable')) {
            contents = contents
                .split(/\r?\n/)
                .filter((line: string) => line.trim() && !line.trim().startsWith('#'))
                .join('\n');
        }

        const encrypted = encrypter.encrypt(contents, false);
        fs.writeFileSync(target, encrypted);
        fs.writeFileSync(source + '.bak', ''); // marker consumed by decrypt --force flows

        if (!this.option('key')) {
            this.warn(`  Encryption key: ${key}`);
            this.comment('  Store this key somewhere safe — it is required to decrypt.');
        }
        this.info(`Environment successfully encrypted at ${target}`);
    }
}

function generateKey(): string {
    return require('crypto').randomBytes(32).toString('base64');
}

class EnvDecryptCommand extends Command {
    static signature = "env:decrypt {--key= : The encryption key} {--cipher=AES-256-CBC} {--env=} {--force : Overwrite the existing environment file}";
    static description = 'Decrypt an environment file';

    async handle(): Promise<any> {
        const environment = this.option('env') || '';
        const source = this.app.basePath(environment ? `.env.${environment}.encrypted` : '.env.encrypted');
        const target = this.app.basePath(environment ? `.env.${environment}` : '.env');

        if (!fs.existsSync(source)) throw new Error(`Encrypted environment file not found: ${source}`);
        if (fs.existsSync(target) && !this.option('force')) {
            throw new Error(`Target file already exists. Use --force to overwrite.`);
        }

        const key = this.option('key') || process.env.LARAVEL_ENV_ENCRYPTION_KEY;
        if (!key) throw new Error('A decryption key is required (--key or LARAVEL_ENV_ENCRYPTION_KEY).');

        const EncrypterClass = require('../../Encryption/Encrypter');
        const encrypter = new EncrypterClass(key, this.option('cipher'));
        const decrypted = encrypter.decrypt(fs.readFileSync(source, 'utf8'), false);

        fs.writeFileSync(target, decrypted);
        this.info(`Environment successfully decrypted at ${target}`);
    }
}

// ---------------------------------------------------------------------------
// key / optimize / down / up / storage
// ---------------------------------------------------------------------------

class KeyGenerateCommand extends Command {
    static signature = 'key:generate {--show : Display the key instead of modifying files} {--force : Overwrite without confirmation}';
    static description = 'Set the application key';

    async handle(): Promise<any> {
        const key = `base64:${generateKey()}`;

        if (this.option('show')) {
            this.info(key);
            return;
        }

        const envFile = this.app.basePath('.env');
        if (!fs.existsSync(envFile)) {
            fs.copyFileSync(this.app.basePath('.env.example'), envFile);
        }

        let contents = fs.readFileSync(envFile, 'utf8');
        if (/^APP_KEY=.*$/m.test(contents)) {
            contents = contents.replace(/^APP_KEY=.*$/m, `APP_KEY=${key}`);
        } else {
            contents += `\nAPP_KEY=${key}\n`;
        }
        fs.writeFileSync(envFile, contents);

        this.info(`Application key set successfully: ${key}`);
    }
}

class DownCommand extends Command {
    static signature =
        'down {--secret= : Bypass secret token} {--with-secret : Generate a secret} {--render=} {--redirect=} {--refresh=} {--retry=}';
    static description = 'Put the application into maintenance mode';

    async handle(): Promise<any> {
        const payload = {
            time: Date.now(),
            secret: this.option('secret') || (this.option('with-secret') ? randomToken() : null),
            redirect: this.option('redirect'),
            template: this.option('render'),
            retry: this.option('retry'),
            refresh: this.option('refresh'),
        };

        const file = this.app.storagePath('framework', 'down');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(payload));

        this.info('Application is now in maintenance mode.');
        if (payload.secret) {
            this.line(`  Bypass URL: /${payload.secret}`);
        }
    }
}

class UpCommand extends Command {
    static signature = 'up';
    static description = 'Bring the application out of maintenance mode';

    async handle(): Promise<any> {
        const file = this.app.storagePath('framework', 'down');
        if (fs.existsSync(file)) fs.unlinkSync(file);
        this.info('Application is now live.');
    }
}

function randomToken(): string {
    return require('crypto').randomBytes(16).toString('hex');
}

class StorageLinkCommand extends Command {
    static signature = 'storage:link';
    static description = 'Create the symbolic links configured for this application';

    async handle(): Promise<any> {
        const created = this.app.make('storage').linkPublic();
        this[created ? 'info' : 'warn'](
            created ? 'The [public/storage] link has been created.' : 'The [public/storage] link already exists.'
        );
    }
}

class OptimizeCommand extends Command {
    static signature = 'optimize';
    static description = 'Cache the framework bootstrap, configuration, and metadata';

    async handle(): Promise<any> {
        await new ConfigCacheCommand(this.app).run({ arguments: {}, options: {} });
        await new ViewCacheCommand(this.app).run({ arguments: {}, options: {} });
        this.info('Files cached successfully.');
    }
}

class OptimizeClearCommand extends Command {
    static signature = 'optimize:clear';
    static description = 'Remove all cached config and view files';

    async handle(): Promise<any> {
        await new ConfigClearCommand(this.app).run({ arguments: {}, options: {} });
        await new ViewClearCommand(this.app).run({ arguments: {}, options: {} });
        this.info('Caches cleared successfully.');
    }
}

class ConfigCacheCommand extends Command {
    static signature = 'config:cache';
    static description = 'Create a cache file for faster configuration loading';

    async handle(): Promise<any> {
        const all = this.app.configRepository.all();
        const target = this.app.bootstrapPath('cache', 'config.js');
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, `'use strict'; module.exports = ${JSON.stringify(all, null, 4)};`);
        this.info('Configuration cached successfully.');
    }
}

class ViewCacheCommand extends Command {
    static signature = 'view:cache';
    static description = "Pre-compile all of the application's Blade templates";

    async handle(): Promise<any> {
        const count = this.app.make('view').cacheAll();
        this.info('Blade templates cached successfully.');
        void count;
    }
}

class ViewClearCommand extends Command {
    static signature = 'view:clear';
    static description = 'Clear all compiled view files';

    async handle(): Promise<any> {
        this.app.make('view').clearCache();
        this.info('Compiled views cleared successfully.');
    }
}

class CacheClearCommand extends Command {
    static signature = 'cache:clear {--store= : The cache store to clear}';
    static description = 'Flush the application cache';

    async handle(): Promise<any> {
        await this.app.make('cache').store(this.option('store')).flush();
        this.info('Application cache cleared successfully.');
    }
}

class QueueFailedCommand extends Command {
    static signature = 'queue:failed';
    static description = 'List all of the failed queue jobs';

    async handle(): Promise<any> {
        const rows = await this.app
            .make('db')
            .table('failed_jobs')
            .orderBy('id', 'desc')
            .get();
        if (rows.length === 0) {
            this.info('No failed jobs.');
            return;
        }
        this.table(
            ['ID', 'Job', 'Queue', 'Failed At'],
            rows.map((row: any) => {
                let name = 'unknown';
                try { name = JSON.parse(row.payload || '{}').displayName || JSON.parse(row.payload || '{}').job || name; } catch {}
                return [row.id, name, row.queue, row.failed_at];
            })
        );
        for (const row of rows) {
            this.line(`  uuid: ${row.uuid}`);
        }
    }
}

class QueueRetryCommand extends Command {
    static signature = 'queue:retry {id* : The ID or UUID of the failed job(s), or "all"}';
    static description = 'Retry a failed queue job';

    async handle(): Promise<any> {
        const keys = (this.argument('id') || []).map(String);
        if (keys.length === 0) {
            this.warn('Please pass the job ID or "all".');
            return 1;
        }

        const db = this.app.make('db');
        let failed: any[] = [];
        if (keys.includes('all')) {
            failed = await db.table('failed_jobs').get();
        } else {
            for (const key of keys) {
                const row =
                    (await db.table('failed_jobs').where('uuid', key).first()) ||
                    (await db.table('failed_jobs').where('id', Number(key) || 0).first());
                if (row) failed.push(row);
            }
        }

        if (failed.length === 0) {
            this.warn('No matching failed jobs.');
            return 1;
        }

        for (const row of failed) {
            const DatabaseQueue = require('../../Queue/QueueManager').DatabaseQueue;
            await new DatabaseQueue(this.app).pushRaw(row.payload, row.queue);
            await db.table('failed_jobs').where('uuid', row.uuid).delete();
            this.info(`Retried job [${row.uuid}].`);
        }
    }
}

class QueueForgetCommand extends Command {
    static signature = 'queue:forget {id : The UUID or ID of the failed job}';
    static description = 'Delete a failed queue job';

    async handle(): Promise<any> {
        const id = String(this.argument('id'));
        await this.app
            .make('db')
            .table('failed_jobs')
            .where('uuid', id)
            .orWhere('id', Number(id) || 0)
            .delete();
        this.info(`Deleted failed job [${id}].`);
    }
}

class QueueFlushCommand extends Command {
    static signature = 'queue:flush {--hours= : Only flush jobs that failed more than N hours ago}';
    static description = 'Delete all of the failed queue jobs';

    async handle(): Promise<any> {
        await this.app.make('db').table('failed_jobs').delete();
        this.info('Failed jobs flushed.');
    }
}

class TinkerCommand extends Command {
    static signature = 'tinker';
    static description = 'Interact with your application in a REPL (reads stdin)';

    async handle(): Promise<any> {
        const repl = require('repl').start({ prompt: '>>> ', useColors: true });
        repl.context.app = this.app;
        repl.context.Artisan = this.app.make('artisan');
        this.line('Nodevel Tinker — type .exit to leave.');
        await new Promise(() => {}); // keep the REPL open until user exits
    }
}

module.exports = {
    default: AboutCommand,
    About: AboutCommand,
    ConfigShow: ConfigShowCommand,
    ConfigClear: ConfigClearCommand,
    ConfigCache: ConfigCacheCommand,
    EnvEncrypt: EnvEncryptCommand,
    EnvDecrypt: EnvDecryptCommand,
    KeyGenerate: KeyGenerateCommand,
    Down: DownCommand,
    QueueForget: QueueForgetCommand,
    QueueFlush: QueueFlushCommand,
    Up: UpCommand,
    StorageLink: StorageLinkCommand,
    Optimize: OptimizeCommand,
    OptimizeClear: OptimizeClearCommand,
    ViewCache: ViewCacheCommand,
    ViewClear: ViewClearCommand,
    CacheClear: CacheClearCommand,
    QueueFailed: QueueFailedCommand,
    QueueRetry: QueueRetryCommand,
    Tinker: TinkerCommand,
};
