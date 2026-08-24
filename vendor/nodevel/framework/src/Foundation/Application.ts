'use strict';

const fs = require('fs');
const path = require('path');

const Container = require('../Container/Container');
const Repository = require('../Support/Repository');
const Env = require('../Support/Env');
const Dispatcher = require('../Events/Dispatcher');
const Pipeline = require('../Pipeline/Pipeline');
const { DatabaseManager } = require('../Database/DatabaseManager');
const SchemaBuilder = require('../Database/Schema/Builder');
const Migrator = require('../Database/Migrations/Migrator');
const { CacheManager } = require('../Cache/CacheManager');
const LogManager = require('../Log/LogManager');
const Encrypter = require('../Encryption/Encrypter');
const HashManager = require('../Hashing/HashManager');
const HttpClient = require('../Http/Client').default;
const { SessionManager } = require('../Session/SessionManager');
const { Router } = require('../Routing/Router');
const UrlGenerator = require('../Routing/UrlGenerator');
const ViewFactory = require('../View/Factory');
const { AuthManager } = require('../Auth/AuthManager');
const { QueueManager } = require('../Queue/QueueManager');
const { Worker } = require('../Queue/Worker');
const { FilesystemManager } = require('../Filesystem/FilesystemManager');
const BroadcastModule = require('../Broadcasting/BroadcastManager');
const { MailManager, Message } = require('../Mail/Mailer');
const { NotificationSender } = require('../Notifications/Notification');
const { Validator } = require('../Validation/Validator');
const Model = require('../Database/Eloquent/Model');

export {};

/**
 * The application container / service locator — the equivalent of
 * `Illuminate\Foundation\Application`.
 */
class Application extends Container {
    static declare singletonInstance?: Application;

    declare basePath_: string;
    declare registeredProviders: any[];
    declare booted: boolean;
    declare bootingCallbacks: ((app: Application) => any)[];
    declare terminatedCallbacks: ((app: Application) => any)[];
    declare ranMigrationsInRequest: boolean;
    declare middlewareAliases: Record<string, any>;
    declare configRepository: any;
    declare globalMiddleware?: any;

    constructor(basePath: string) {
        super();

        if (Application.singletonInstance) return Application.singletonInstance;
        Application.singletonInstance = this;
        Container.setInstance(this);

        this.basePath_ = basePath;
        this.registeredProviders = [];
        this.booted = false;
        this.bootingCallbacks = [];
        this.terminatedCallbacks = [];
        this.ranMigrationsInRequest = false;
        this.middlewareAliases = {};

        // Load environment before configuration.
        Env.load(path.join(basePath, this.environmentFile()));

        // Register the global helpers (`view()`, `config()`, `env()`, ...).
        require('../Support/helpers').registerGlobals();

        this.configRepository = Repository.loadFromDirectory(path.join(basePath, 'config'));
        this.bindCoreServices();
    }

    static getInstance(): Application | undefined {
        return Application.singletonInstance;
    }

    environmentFile(): string {
        const envOverride = process.env.APP_ENV || process.argv.includes('--env')
            ? process.env.APP_ENV
            : null;
        if (process.argv.includes('--env')) {
            const idx = process.argv.indexOf('--env');
            return `.env.${process.argv[idx + 1]}`;
        }
        return envOverride ? `.env.${envOverride}` : '.env';
    }

    bindCoreServices(): void {
        this.instance('app', this);
        this.alias('app', 'app');

        this.instance('config', this.configRepository);
        this.singleton('events', () => new Dispatcher(this));
        this.singleton('db', () => new DatabaseManager(this));
        this.singleton('db.schema', () => new SchemaBuilder(this.make('db').connection()));
        this.singleton('migrator', () => new Migrator(this));
        this.singleton('cache', () => new CacheManager(this));
        this.singleton('log', () => new LogManager(this));
        this.singleton(
            'encrypter',
            () => new Encrypter(this.config('app.key') || 'base64:' + Buffer.alloc(32).toString('base64'))
        );
        this.singleton('hash', () => new HashManager(this.config('hashing', {})));
        this.singleton('http.client', () => new HttpClient());
        this.singleton('session', () => new SessionManager(this));
        this.singleton('router', () => new Router(this));
        this.singleton('url', () => new UrlGenerator(this));
        this.singleton('view', () => new ViewFactory(this));
        this.singleton('auth', () => new AuthManager(this));
        this.singleton('queue', () => new QueueManager(this));
        this.singleton('queue.worker', () => new Worker(this));
        this.singleton('storage', () => new FilesystemManager(this));
        this.singleton('broadcast', () => new BroadcastModule.BroadcastManager(this));
        this.singleton('mailer', () => new MailManager(this).mailer());
        this.singleton('notifications', () => new NotificationSender(this));
        this.singleton('validator', () => Validator);
        this.singleton('pipeline', () => ({
            send: (passable) => Pipeline.send(passable, this),
        }));
        this.singleton('artisan', () => {
            const Artisan = require('../Console/Application');
            return new Artisan(this);
        });
        this.singleton('schedule', () => {
            const { Schedule } = require('../Schedule/Schedule');
            return new Schedule(this);
        });

        // Rate limiter registry lives on the router.
        this.singleton('ratelimiter', () => ({
            for: (name: string, callback: (request: any) => any) =>
                this.make('router').rateLimiter(name, callback),
        }));

        // The User model class used by the auth guard; applications override.
        this.bindIf('auth.model', () => {
            const userFile = this.resolveAppFile('app', 'Models', 'User');
            if (!userFile) throw new Error('Could not resolve the User model.');
            try {
                const loaded = require(userFile);
                return loaded.default || Object.values(loaded)[0];
            } catch {
                throw new Error('Could not resolve the User model.');
            }
        });
    }

    // -- Paths -------------------------------------------------------------------

    basePath(...segments: string[]): string {
        return path.join(this.basePath_, ...segments.filter(Boolean));
    }
    appPath(...segments: string[]): string {
        return this.basePath('app', ...segments.filter(Boolean));
    }
    databasePath(...segments: string[]): string {
        return this.basePath('database', ...segments.filter(Boolean));
    }
    resourcePath(...segments: string[]): string {
        return this.basePath('resources', ...segments.filter(Boolean));
    }
    storagePath(...segments: string[]): string {
        return this.basePath('storage', ...segments.filter(Boolean));
    }
    publicPath(...segments: string[]): string {
        return this.basePath('public', ...segments.filter(Boolean));
    }
    configPath(...segments: string[]): string {
        return this.basePath('config', ...segments.filter(Boolean));
    }
    bootstrapPath(...segments: string[]): string {
        return this.basePath('bootstrap', ...segments.filter(Boolean));
    }
    langPath(...segments: string[]): string {
        return this.basePath('lang', ...segments.filter(Boolean));
    }

    // -- Environment ----------------------------------------------------------------

    environment(...environments: string[]): string | boolean {
        const current =
            process.env.APP_ENV || this.configRepository?.get('app.env') || 'production';
        if (environments.length === 0) return current;
        return environments.includes(current);
    }
    isProduction(): boolean {
        return this.environment() === 'production';
    }
    isLocal(): boolean {
        return this.environment() === 'local';
    }
    isDownForMaintenance(): boolean {
        const file = this.storagePath('framework/down');
        return fs.existsSync(file);
    }

    // -- Booting ---------------------------------------------------------------------

    /** Register a service provider instance or class reference. */
    register(providerClass: any): any {
        const provider =
            typeof providerClass === 'function' ? new providerClass(this) : providerClass;

        provider.register();
        this.registeredProviders.push(provider);
        return provider;
    }

    /** Register all providers from bootstrap/providers.js then boot them. */
    async bootWithProviders(providersList: any[]): Promise<this> {
        for (const provider of providersList) this.register(provider);

        for (const callback of this.bootingCallbacks) await callback(this);

        for (const provider of this.registeredProviders) await provider.boot();

        // Bind models to the application.
        { const { setApplication } = require("../Database/Eloquent/Model"); setApplication(this); }

        this.booted = true;
        await this.make('events').dispatch('booted', [this]);
        return this;
    }

    booting(callback: (app: Application) => any): void {
        this.bootingCallbacks.push(callback);
    }

    terminating(callback: (app: Application) => any): void {
        this.terminatedCallbacks.push(callback);
    }

    async terminate(): Promise<void> {
        for (const callback of this.terminatedCallbacks) await callback(this);
    }

    /** Register the core middleware list used on every request. */
    withGlobalMiddleware(middleware: any): this {
        this.globalMiddleware = middleware;
        this.instance('middleware.global', middleware);
        return this;
    }

    /** Register named middleware aliases (the `$middlewareAliases` equivalent). */
    withMiddlewareAliases(aliases: Record<string, any>): this {
        Object.assign(this.middlewareAliases, aliases);
        for (const [name, implementation] of Object.entries(aliases)) {
            if (typeof implementation === 'function' || typeof implementation === 'object') {
                this.bind(`middleware.${name}`, () =>
                    typeof implementation === 'function'
                        ? new implementation()
                        : implementation
                );
            }
        }
        return this;
    }

    /**
     * Resolve an app-layer file that may exist as `.ts` or `.js`.
     */
    resolveAppFile(...segments: string[]): string | null {
        for (const ext of ['.ts', '.js']) {
            const candidate = path.join(this.basePath_, ...segments) + ext;
            if (fs.existsSync(candidate)) return candidate;
        }
        return null;
    }

    /**
     * Run the application's `bootstrap/app` configuration — the equivalent
     * of Laravel's bootstrap file wiring routing + middleware.
     */
    withBootstrap(): this {
        const file = this.resolveAppFile('bootstrap', 'app');
        if (!file) return this;
        const configure = require(file);
        if (typeof configure === 'function') configure(this);
        return this;
    }

    config(key: string, defaultValue: any = null): any {
        return this.configRepository.get(key, defaultValue);
    }

    env(key: string, defaultValue: any = null): any {
        return Env.get(key, defaultValue);
    }
}

module.exports = Application;
