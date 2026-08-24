'use strict';

export {};

const Route = require('./Route');
const Response = require('../Http/Response');
const Str = require('../Support/Str');

/**
 * The router — a port of `Illuminate\Routing\Router` covering the routing
 * documentation: verb methods, groups, named routes, model binding,
 * fallbacks, rate limiting, and view / redirect shortcuts.
 */

type RouteAction = ((request: any, ...params: any[]) => any) | [Function, string] | string;

type RouteMiddleware = string | { handle: (request: any, next: (request: any) => Promise<any>) => Promise<any> };

/** Structural view of the parts of a Route the Router touches. */
interface RouteEntry {
    methods: string[];
    uri: string;
    action: RouteAction;
    middlewareList: RouteMiddleware[];
    name_: string | null;
    whereConstraints: Record<string, string | null>;
    domainPattern: string | null;
    withTrashed_: boolean;
    scopeBindings_: boolean;
    missingHandler: ((...args: any[]) => any) | null;
    defaults: Record<string, any>;
    parameters?: Record<string, any>;
    paramNames?: string[];
    domainParameters?: Record<string, string>;
    matches(path: string, globalPatterns?: Record<string, string>): Record<string, any> | null;
    getName(): string | null;
    name(name: string): RouteEntry;
    middleware(middleware: RouteMiddleware | RouteMiddleware[]): RouteEntry;
    buildUrl(parameters?: Record<string, any>): string;
}

interface RouteGroupAttributes {
    prefix?: string;
    namePrefix?: string;
    middleware?: RouteMiddleware[];
    where?: Record<string, string>;
    domain?: string;
    as?: string;
    name?: string;
}

class Router {
    app: any;
    routes: RouteEntry[];
    nameLookup: Map<string, any>;
    globalPatterns: Record<string, string>;
    fallbackHandler: RouteAction | null;
    groupStack: RouteGroupAttributes[];
    rateLimiters: Map<string, (request: any) => any>;
    declare pendingNamePrefix?: string | null;
    explicitBindings = new Map<string, any>();

    constructor(app: any) {
        this.app = app;
        this.routes = [];
        this.nameLookup = new Map();
        this.globalPatterns = {};
        this.fallbackHandler = null;
        this.groupStack = [];
        this.rateLimiters = new Map();
        (this as any).current = null;
    }

    // -- Registration -------------------------------------------------------------

    get(uri: string, action: RouteAction): RouteEntry {
        return this.addRoute(['GET', 'HEAD'], uri, action);
    }
    post(uri: string, action: RouteAction): RouteEntry {
        return this.addRoute(['POST'], uri, action);
    }
    put(uri: string, action: RouteAction): RouteEntry {
        return this.addRoute(['PUT'], uri, action);
    }
    patch(uri: string, action: RouteAction): RouteEntry {
        return this.addRoute(['PATCH'], uri, action);
    }
    delete(uri: string, action: RouteAction): RouteEntry {
        return this.addRoute(['DELETE'], uri, action);
    }
    options(uri: string, action: RouteAction): RouteEntry {
        return this.addRoute(['OPTIONS'], uri, action);
    }

    any(uri: string, action: RouteAction): RouteEntry {
        return this.addRoute(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], uri, action);
    }

    match(methods: string[], uri: string, action: RouteAction): RouteEntry {
        return this.addRoute(methods, uri, action);
    }

    redirect(from: string, to: string, status: number = 302): RouteEntry {
        return this.get(from, () => Response.redirectTo(to, status)).name(`redirect_${from}`);
    }

    permanentRedirect(from: string, to: string): RouteEntry {
        return this.redirect(from, to, 301);
    }

    view(uri: string, viewName: string, data: Record<string, any> = {}): RouteEntry {
        return this.get(uri, async (request) => {
            const factory = this.app.make('view');
            return renderView(factory, request, viewName, data);
        });
    }

    addRoute(methods: string[], uri: string, action: RouteAction): RouteEntry {
        const [prefix, namePrefix] = this.currentGroupAttributes();
        const fullUri = joinUri(prefix || '', uri);
        const route = new Route(methods, fullUri, action);

        if (namePrefix) {
            route.middleware([]); // no-op keeps fluent chain simple
            route.name_ = null; // set explicitly by caller
            this.pendingNamePrefix = namePrefix;
        }

        this.applyGroupMiddleware(route);
        this.routes.push(route);
        return route;
    }

    applyGroupMiddleware(route: RouteEntry): void {
        for (const group of this.groupStack) {
            if (group.middleware?.length) route.middlewareList.unshift(...group.middleware);
            if (group.where) Object.assign(route.whereConstraints, group.where);
            if (group.domain && !route.domainPattern) route.domainPattern = group.domain;
        }
        if (this.pendingNamePrefix) {
            route.name_ = this.pendingNamePrefix; // caller may override via .name()
            this.pendingNamePrefix = null;
        }
    }

    currentGroupAttributes(): [string | null, string | null] {
        if (this.groupStack.length === 0) return [null, null];
        const top = this.groupStack[this.groupStack.length - 1];
        return [top.prefix || null, top.namePrefix || null];
    }

    /**
     * Group routes sharing attributes.
     *
     *   router.group({ prefix: 'admin', middleware: ['auth'] }, () => { ... })
     */
    group(attributesOrCallback: RouteGroupAttributes | (() => void), maybeCallback: ((router: Router) => void) | null = null): void {
        const attributes: RouteGroupAttributes =
            typeof attributesOrCallback === 'function' ? {} : attributesOrCallback;
        const callback = (maybeCallback || attributesOrCallback) as (router: Router) => void;

        const merged = { ...(this.groupStack[this.groupStack.length - 1] || {}) };
        if (attributes.prefix) {
            merged.prefix = joinUri(merged.prefix || '', attributes.prefix);
        }
        if (attributes.middleware) {
            merged.middleware = [
                ...(merged.middleware || []),
                ...(Array.isArray(attributes.middleware) ? attributes.middleware : [attributes.middleware]),
            ];
        }
        if (attributes.where) merged.where = { ...(merged.where || {}), ...attributes.where };
        if (attributes.domain) merged.domain = attributes.domain;
        if (attributes.as) merged.namePrefix = `${merged.namePrefix || ''}${attributes.as}`;
        else if (attributes.name) merged.namePrefix = `${merged.namePrefix || ''}${attributes.name}`;

        this.groupStack.push(merged);
        try {
            callback(this);
        } finally {
            this.groupStack.pop();
        }
    }

    /** Register a route that executes when nothing else matches. */
    fallback(action: RouteAction): this {
        this.fallbackHandler = action;
        return this;
    }

    pattern(name: string, expression: string): void {
        this.globalPatterns[name] = expression;
    }

    // -- Rate limiting --------------------------------------------------------------

    rateLimiter(name: string, callback: (request: any) => any): void {
        this.rateLimiters.set(name, callback);
    }

    // -- Model binding ----------------------------------------------------------------

    model(key: string, classReference: any): void {
        this.explicitBindings.set(key, classReference);
    }

    bind(key: string, binder: any): void {
        this.explicitBindings.set(key, binder);
    }

    // -- Dispatching --------------------------------------------------------------------

    /** Find a matching route for a request. Returns the route or null. */
    findRoute(request: any): RouteEntry | null {
        for (const route of this.routes) {
            if (!route.methods.includes(request.method)) continue;
            const parameters = route.matches(request.path, this.globalPatterns);
            if (!parameters) continue;
            Object.assign(parameters, route.domainParameters || {});
            request.setRoute({ ...route, parameters });
            return route;
        }
        return null;
    }

    /** Dispatch a request through middleware and the matched route. */
    async dispatch(request: any): Promise<any> {
        const pipeline = this.app.make('pipeline');

        const route = this.findRoute(request);
        (this as any).current = route;

        let target;
        let middlewareList;

        if (route) {
            target = async () => this.runRouteWithinStack(route, request);
            const globalMw = this.app.bound('middleware.global')
                ? this.app.make('middleware.global')
                : [];
            middlewareList = [...globalMw, ...route.middlewareList];
        } else if (this.fallbackHandler) {
            target = async () => this.runAction(this.fallbackHandler as RouteAction, request, []);
            middlewareList = this.app.bound('middleware.global')
                ? this.app.make('middleware.global')
                : [];
        } else {
            target = async () => Response.make('Not Found', 404);
            // Global middleware still runs for unmatched routes (404s), the
            // same as Laravel where the request passes through the global
            // stack before the router reports "not found".
            middlewareList = this.app.bound('middleware.global')
                ? this.app.make('middleware.global')
                : [];
        }

        return pipeline.send(request).through(middlewareList).then(target);
    }

    async runRouteWithinStack(route: RouteEntry, request: any): Promise<any> {
        // Resolve implicit bindings declared in controller signatures is not
        // possible without reflection in JS; instead we support explicit
        // bindings registered via Route::model / bind and enum-style binding
        // through custom resolvers.
        await this.resolveBoundParameters(route, request);

        // Apply rate limiting declared as `throttle:<limiter>` middleware.
        for (const mw of route.middlewareList) {
            if (typeof mw === 'string' && mw.startsWith('throttle')) {
                const response = await this.handleThrottle(mw, request);
                if (response) return response;
            }
        }

        return this.runAction(route.action, request, route.parameters);
    }

    async resolveBoundParameters(route: RouteEntry, request: any): Promise<void> {
        void request;
        for (const [param, value] of Object.entries(route.parameters || {})) {
            const binding = this.explicitBindings.get(param);
            if (!binding) continue;
            const resolved =
                typeof binding === 'function' && !isClassRef(binding)
                    ? await binding(value, route)
                    : await resolveModel(binding, value, route.withTrashed_);
            if (resolved === undefined || resolved === null) {
                if (route.missingHandler) throw { __missing__: route.missingHandler };
                throw new ModelNotFoundError(param, value);
            }
            route.parameters![param] = resolved;
        }
    }

    async handleThrottle(spec: string, request: any): Promise<any> {
        const [, limiterName] = spec.split(':');
        const limiter = this.rateLimiters.get(limiterName || 'default');
        if (!limiter) return null;

        const limitConfig = await limiter(request);
        const limits = Array.isArray(limitConfig) ? limitConfig : [limitConfig];

        const cache = this.app.make('cache');
        for (const limit of limits) {
            if (limit.max === 0 && !limit.key) continue; // Limit::none()
            const key = `throttle:${limitKeyOf(limit, request)}`;
            const windowSeconds = Math.floor((limit.decay ?? 60));

            const attempts = Number(await cache.get(key, 0)) + 1;
            await cache.put(key, attempts, windowSeconds);

            if (attempts > limit.max) {
                const retryAfter = Math.max(
                    1,
                    Math.ceil(((await cache.get(`${key}:timer`, Date.now() - windowSeconds * 1000)) +
                        windowSeconds * 1000 -
                        Date.now()) / 1000)
                );
                return Response.make('Too Many Attempts.', 429, {
                    'retry-after': String(retryAfter),
                    'x-ratelimit-limit': String(limit.max),
                    'x-ratelimit-remaining': '0',
                });
            }
        }
        return null;
    }

    async runAction(action: RouteAction, request: any, parameters?: Record<string, any> | any[] | null): Promise<any> {
        const params = Object.values(parameters || {});

        if (typeof action === 'string') {
            return action; // placeholder — string actions resolved by kernel
        }

        if (Array.isArray(action)) {
            const [controllerClass, methodName] = action;
            const instance = this.app.build(controllerClass);
            const result = await instance[methodName](request, ...params);
            return normalizeResponse(result, this.app);
        }

        const result = await action(request, ...params);
        return normalizeResponse(result, this.app);
    }

    // -- Introspection ---------------------------------------------------------------

    getRoutes(): RouteEntry[] {
        return this.routes;
    }

    current(): any {
        return (this as any).current;
    }

    currentRouteName(): string | null {
        return (this as any).current?.getName?.() || null;
    }

    currentRouteAction(): string {
        const action = (this as any).current?.action;
        if (Array.isArray(action)) {
            return `${action[0].name}@${action[1]}`;
        }
        return typeof action === 'function' ? action.name : String(action);
    }

    urlFor(name: string, parameters: Record<string, any> = {}, absolute: boolean = false): string {
        const route = this.routes.find((r) => r.getName() === name);
        if (!route) throw new Error(`Unable to generate a URL for the named route "${name}".`);
        const path = route.buildUrl(parameters);
        if (!absolute) return path;
        const base = this.app.config('app.url', 'http://localhost');
        return `${String(base).replace(/\/$/, '')}${path}`;
    }
}

class ModelNotFoundError extends Error {
    declare status: number;

    constructor(param: string, value: any) {
        super(`No query results for model bound to parameter "{${param}}" with value ${value}.`);
        this.status = 404;
    }
}

function isClassRef(value: unknown): boolean {
    return typeof value === 'function' && /^\s*class\s/.test(String(value));
}

async function resolveModel(classRef: any, value: any, withTrashed: boolean): Promise<any> {
    const model = typeof classRef === 'function' ? classRef : classRef.default || classRef;
    const query = model.query ? model.query() : model;
    if (withTrashed && query.withTrashed) query.withTrashed();
    return query.where(model.getKeyName ? model.getKeyName() : 'id', value).first();
}

/** Normalize arbitrary handler results into a Response. */
async function normalizeResponse(result: any, app: any): Promise<any> {
    if (result instanceof Response) return result;

    if (typeof result === 'object' && result !== null && typeof result.renderAsync === 'function') {
        // A View instance — rendering is async in Nodevel.
        const html = await result.renderAsync();
        return Response.make(html, 200, { 'content-type': 'text/html' });
    }

    if (result && typeof result.toResponse === 'function') return result.toResponse();

    if (typeof result === 'object' && result !== null && !(result instanceof Response)) {
        // Arrays and plain objects become JSON responses.
        const data = result && typeof result.toJson === 'function' ? JSON.parse(result.toJson()) : result;
        return Response.json(data);
    }

    return Response.make(result === undefined || result === null ? '' : String(result));
}

async function renderView(factory: any, request: any, viewName: string, data: Record<string, any>): Promise<any> {
    void request;
    const view = await factory.make(viewName, data);
    const html = await view.renderAsync();
    return Response.make(html, 200, { 'content-type': 'text/html' });
}

function joinUri(prefix: unknown, uri: unknown): string {
    const p = String(prefix || '').replace(/\/$/, '');
    const u = String(uri || '/');
    if (!u.startsWith('/')) return `${p}/${u}`.replace(/\/{2,}/g, '/');
    return `${p}${u}`.replace(/\/{2,}/g, '/') || '/';
}

function limitKeyOf(limit: any, request: any): string {
    const byValue = typeof limit.key === 'function' ? limit.key(request) : limit.key;
    return `${limit.limiter}:${byValue}`;
}

module.exports = { Router, ModelNotFoundError, normalizeResponse, joinUri, Str };
