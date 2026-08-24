'use strict';

/**
 * Testing helpers — the equivalent of `Illuminate\Foundation\Testing`
 * (MakesHttpRequests, RefreshDatabase, actingAs, etc.).
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

import type { IncomingMessage } from 'http';

export {};

let bootedApp: any = null;

/** Boot (or reuse) the application for tests. */
async function bootApp(basePath?: string): Promise<any> {
    if (bootedApp) return bootedApp;

    process.env.APP_ENV = 'testing';

    const Application = require('../Application');
    const app = new Application(basePath || findBasePath());

    // Run the application bootstrap (middleware + aliases).
    app.withBootstrap();

    const providersFile = app.resolveAppFile('bootstrap', 'providers');
    const providers = providersFile ? require(providersFile) : [];
    await app.bootWithProviders(providers);

    // Tests use in-memory stores.
    const { ArraySessionHandler } = require('../../Session/SessionManager');
    const handler = new ArraySessionHandler();
    const crypto = require('crypto');
    app.instance('session', {
        startForRequest: () => {
            const id = crypto.randomUUID().replace(/-/g, '');
            return new (require('../../Session/SessionManager').Store)(handler, id);
        },
        save: () => {},
        handler,
    });

    bootedApp = app;
    return app;
}

function findBasePath(): string {
    let dir = __dirname;
    while (dir !== '/' && !fs.existsSync(path.join(dir, 'bootstrap'))) {
        dir = path.dirname(dir);
    }
    return dir;
}

/** Reset the testing application between suites. */
function refreshApp(): void {
    bootedApp = null;
}

class TestCaseContext {
    app: any;
    cookiesHeader: string[];
    declare sessionManager?: any;
    declare authenticatedUser?: any;

    constructor(app: any) {
        this.app = app;
        this.cookiesHeader = [];
    }

    /**
     * Make an in-process request to the router — no network involved.
     */
    async call(method: string, uri: string, options: any = {}): Promise<TestResponse> {
        const Request = require('../../Http/Request');
        const Response = require('../../Http/Response');
        const Router = require('../../Routing/Router');
        const { PassableRequestShim }: { PassableRequestShim?: any } = {};

        void PassableRequestShim;

        const headers: Record<string, string> = {
            host: 'localhost',
            accept: 'text/html',
            ...Object.fromEntries(
                Object.entries(options.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
            ),
        };
        if (options.json !== undefined) {
            headers['content-type'] = 'application/json';
            headers.accept = 'application/json';
        }

        const nodeReq = new http.IncomingMessage(null as any);
        nodeReq.headers = headers;
        nodeReq.method = method.toUpperCase();
        nodeReq.url = uri;
        nodeReq.socket = { remoteAddress: '127.0.0.1' } as any;

        const bodyText =
            options.json !== undefined
                ? JSON.stringify(options.json)
                : options.form
                    ? new URLSearchParams(options.form).toString()
                    : '';

        const request = Object.assign(Object.create(Request.prototype), await makeRequest(nodeReq, bodyText));

        // Session + auth context per test call. Keep the manager (not the
        // Store) memoized so repeated calls keep working.
        this.sessionManager = this.sessionManager || this.app.make('session');
        const session = this.sessionManager.startForRequest(request);
        this.app.instance('request', request);
        this.app.instance('session', session);

        if (this.authenticatedUser) {
            const Guard = require('../../Auth/AuthManager').Guard;
            const guard = new Guard(this.app);
            guard.user_ = this.authenticatedUser;
            guard.resolved = true;
            request.setUser(this.authenticatedUser);
            session.put('login_web_web', this.authenticatedUser.getKey());
        }

        const router = this.app.make('router');
        let response;
        try {
            response = await router.dispatch(request);
        } catch (error) {
            response = errorToResponse(error, this.app);
        }

        return new TestResponse(response, request);
    }

    get(uri: string, options?: any): Promise<TestResponse> {
        return this.call('GET', uri, options);
    }
    post(uri: string, options?: any): Promise<TestResponse> {
        return this.call('POST', uri, options);
    }
    put(uri: string, options?: any): Promise<TestResponse> {
        return this.call('PUT', uri, options);
    }
    patch(uri: string, options?: any): Promise<TestResponse> {
        return this.call('PATCH', uri, options);
    }
    delete(uri: string, options?: any): Promise<TestResponse> {
        return this.call('DELETE', uri, options);
    }
    postJson(uri: string, data: any, headers?: any): Promise<TestResponse> {
        return this.call('POST', uri, { json: data, headers });
    }
    getJson(uri: string, headers?: any): Promise<TestResponse> {
        return this.call('GET', uri, { json: null, headers });
    }
    deleteJson(uri: string, headers?: any): Promise<TestResponse> {
        return this.call('DELETE', uri, { json: null, headers });
    }

    /** Authenticate as a user for subsequent requests — Sanctum::actingAs style. */
    async actingAs(user: any, abilities: string[] = ['*']): Promise<this> {
        this.authenticatedUser = user;

        // Also provision a Sanctum token record when requested.
        if (abilities && abilities.length && this.app.make('db')) {
            try {
                await require('../../Auth/AuthManager').Sanctum.createToken(user, 'testing', abilities);
            } catch {
                /* table may not exist in unit tests */
            }
        }
        return this;
    }
}

async function makeRequest(nodeReq: IncomingMessage, bodyText: string): Promise<any> {
    // Reuse the parsing logic of Request without waiting on streams.
    const Request = require('../../Http/Request');
    return new Request(nodeReq, bodyText);
}

class TestResponse {
    declare response: any;
    declare request: any;

    constructor(response: any, request: any) {
        this.response = response;
        this.request = request;
    }

    status(): number {
        return this.response.statusCode;
    }
    content(): string {
        return typeof this.response.content === 'string'
            ? this.response.content
            : String(this.response.content ?? '');
    }
    json(key: string | null = null): any {
        const parsed = JSON.parse(this.content());
        if (key === null) return parsed;
        return key.split('.').reduce((acc: any, part) => (acc ? acc[part] : undefined), parsed);
    }
    headers(): Record<string, any> {
        return this.response.getHeaders();
    }
    header(name: string): any {
        return this.headers()[name.toLowerCase()];
    }

    assertOk(): boolean {
        return assertEqual(this.status(), 200, `Expected status 200, got ${this.status()}.`);
    }
    assertCreated(): boolean {
        return assertEqual(this.status(), 201, `Expected status 201, got ${this.status()}.`);
    }
    assertNoContent(): boolean {
        return assertEqual(this.status(), 204, `Expected status 204, got ${this.status()}.`);
    }
    assertNotFound(): boolean {
        return assertEqual(this.status(), 404, `Expected status 404, got ${this.status()}.`);
    }
    assertForbidden(): boolean {
        return assertEqual(this.status(), 403, `Expected status 403, got ${this.status()}.`);
    }
    assertUnauthorized(): boolean {
        return assertEqual(this.status(), 401, `Expected status 401, got ${this.status()}.`);
    }
    assertStatus(status: number): boolean {
        return assertEqual(this.status(), status, `Expected status ${status}, got ${this.status()}.`);
    }
    assertSee(text: any): boolean {
        return assertTrue(
            this.content().includes(String(text)),
            `Response does not contain "${text}".\nGot: ${this.content().slice(0, 300)}`
        );
    }
    assertDontSee(text: any): boolean {
        return assertFalse(this.content().includes(String(text)), `Response contains "${text}".`);
    }
    assertJsonPath(path_: string, expected: any): boolean {
        const actual = this.json(path_);
        return assertEqual(actual, expected, `JSON path [${path_}] is ${JSON.stringify(actual)}.`);
    }
    assertJsonFragment(fragment: any): boolean {
        return assertTrue(
            this.content().includes(JSON.stringify(fragment).replace(/^"|"$/g, '').slice(0, 50)) ||
                deepIncludes(this.json(), fragment),
            `Response JSON does not include ${JSON.stringify(fragment)}.`
        );
    }
    assertRedirect(expectedPath: string | null = null): boolean {
        assertTrue([301, 302, 303, 307].includes(this.status()), `Expected redirect, got ${this.status()}.`);
        if (expectedPath) {
            assertEqual(this.header('location'), expectedPath, `Redirect target mismatch.`);
        }
        return true;
    }
}

function deepIncludes(haystack: any, needle: any): boolean {
    if (typeof haystack !== 'object' || haystack === null) return false;
    return Object.entries(needle).every(([key, value]) =>
        typeof value === 'object' && value !== null
            ? deepIncludes(haystack[key], value)
            : haystack[key] === value
    );
}

function errorToResponse(error: any, app: any): any {
    void app;
    const Response = require('../../Http/Response');
    const status = error?.status || 500;
    return Response.make(
        JSON.stringify({ message: error?.message || 'Server Error' }, null, 2),
        status,
        { 'content-type': 'application/json' }
    );
}

// -- Assertion primitives ------------------------------------------------------

function assertTrue(condition: any, message?: string): boolean {
    if (!condition) throw new Error(`Failed asserting that condition is true.\n${message || ''}`);
    return true;
}
function assertFalse(condition: any, message?: string): boolean {
    return assertTrue(!condition, message);
}
function assertEqual(actual: any, expected: any, message?: string): boolean {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    if (!pass) throw new Error(`${message || ''}\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`);
    return true;
}

module.exports = {
    bootApp,
    refreshApp,
    TestCaseContext,
    TestResponse,
    assertTrue,
    assertFalse,
    assertEqual,
};
