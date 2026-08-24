'use strict';

/**
 * Global helper functions — the Nodevel equivalents of Laravel's helpers.
 *
 * These are attached to `global` by the framework boot process so application
 * code may use them anywhere without imports, just like Laravel's helpers.
 */

// Type-only import: marks this file as a module for the compiler without
// emitting anything (erased at compile time, zero runtime effect).
import type {} from './Arr';

/**
 * Pragmatic typings for the global helper functions registered by
 * `registerGlobals()`. Container-resolved returns are typed `any`.
 */
interface GlobalHelpers {
    env(key: string, defaultValue?: any): any;
    app(): any;
    config(key?: any, defaultValue?: any): any;
    base_path(...segments: string[]): string;
    app_path(...segments: string[]): string;
    database_path(...segments: string[]): string;
    resource_path(...segments: string[]): string;
    storage_path(...segments: string[]): string;
    public_path(...segments: string[]): string;
    now(): Date;
    view(name: any, data?: Record<string, any>): Promise<any>;
    url(...args: any[]): any;
    route(...args: any[]): any;
    asset(...args: any[]): any;
    session(...args: any[]): any;
    auth(...args: any[]): any;
    redirect(to?: string | null, status?: number): any;
    response(): {
        json: (data: any, status?: number) => any;
        make: (content: any, status?: number) => any;
        noContent: (status?: number) => any;
    };
    event(...args: any[]): any;
}

declare global {
    // eslint-disable-next-line no-var
    var env: GlobalHelpers['env'];
    // eslint-disable-next-line no-var
    var app: GlobalHelpers['app'];
    // eslint-disable-next-line no-var
    var config: GlobalHelpers['config'];
    // eslint-disable-next-line no-var
    var base_path: GlobalHelpers['base_path'];
    // eslint-disable-next-line no-var
    var app_path: GlobalHelpers['app_path'];
    // eslint-disable-next-line no-var
    var database_path: GlobalHelpers['database_path'];
    // eslint-disable-next-line no-var
    var resource_path: GlobalHelpers['resource_path'];
    // eslint-disable-next-line no-var
    var storage_path: GlobalHelpers['storage_path'];
    // eslint-disable-next-line no-var
    var public_path: GlobalHelpers['public_path'];
    // eslint-disable-next-line no-var
    var now: GlobalHelpers['now'];
    // eslint-disable-next-line no-var
    var view: GlobalHelpers['view'];
    // eslint-disable-next-line no-var
    var url: GlobalHelpers['url'];
    // eslint-disable-next-line no-var
    var route: GlobalHelpers['route'];
    // eslint-disable-next-line no-var
    var asset: GlobalHelpers['asset'];
    // eslint-disable-next-line no-var
    var session: GlobalHelpers['session'];
    // eslint-disable-next-line no-var
    var auth: GlobalHelpers['auth'];
    // eslint-disable-next-line no-var
    var redirect: GlobalHelpers['redirect'];
    // eslint-disable-next-line no-var
    var response: GlobalHelpers['response'];
    // eslint-disable-next-line no-var
    var event: GlobalHelpers['event'];
}

const app = (): any => require('../Foundation/Application').getInstance();

exports.env = (key: string, defaultValue: any = null): any =>
    require('./Env').get(key, defaultValue);

exports.app = app;

exports.config = (key: any, defaultValue: any = null): any => app().make('config').get(key, defaultValue);

exports.base_path = (...segments: string[]): string => app().basePath(...segments);
exports.app_path = (...segments: string[]): string => app().appPath(...segments);
exports.database_path = (...segments: string[]): string => app().databasePath(...segments);
exports.resource_path = (...segments: string[]): string => app().resourcePath(...segments);
exports.storage_path = (...segments: string[]): string => app().storagePath(...segments);
exports.public_path = (...segments: string[]): string => app().publicPath(...segments);

exports.now = (): Date => new Date();

/** Render a view — the `view()` helper. */
exports.view = async (name: any, data: Record<string, any> = {}): Promise<any> =>
    app().make('view').make(name, data);

/** URL helpers. */
exports.url = (...args: any[]): any => app().make('url').to(...args);
exports.route = (...args: any[]): any => app().make('url').route(...args);
exports.asset = (...args: any[]): any => app().make('url').asset(...args);

/** Session helper. */
exports.session = (...args: any[]): any => app().make('session');

/** Auth helper. */
exports.auth = (...args: any[]): any => app().make('auth');

/** Redirect helper: redirect()->to(path) / redirect(path). */
exports.redirect = (to: string | null = null, status: number = 302): any => {
    const Response = require('../Http/Response');
    const target = {
        to: (path: string, s: number = status) => Response.redirectTo(path, s),
        route: (name: string, params: Record<string, any> = {}, s: number = status) =>
            Response.redirectTo(app().make('url').route(name, params, false), s),
        back: () => Response.redirectTo(app().make('url').previous('/'), status),
    };
    return to ? target.to(to, status) : target;
};

/** Response factory helper. */
exports.response = (): { json: (data: any, status?: number) => any; make: (content: any, status?: number) => any; noContent: (status?: number) => any } => {
    const Response = require('../Http/Response');
    return {
        json: (data: any, status: number = 200) => Response.json(data, status),
        make: (content: any, status: number = 200) => Response.make(content, status),
        noContent: (status: number = 204) => Response.noContent(status),
    };
};

/** Event dispatch helper — `event(new UserRegistered($user))`. */
exports.event = (...args: any[]): any => app().make('events').dispatch(...args);

/** Attach all helpers to the global object. */
exports.registerGlobals = (): void => {
    for (const [name, fn] of Object.entries(exports)) {
        if (name === 'registerGlobals') continue;
        global[name] = fn;
    }
};
