'use strict';

/**
 * Facades — static proxies to container services, mirroring
 * `Illuminate\Support\Facades`.
 *
 *   const { Route } = require('@nodevel/framework').Facades;
 *   Route.get('/users', handler);
 */

const Application = require('../Foundation/Application');

export {};

/**
 * A facade is a Proxy over a class whose static methods forward to the
 * container-resolved service instance. Since every property access resolves
 * a dynamic service, facades are typed as `any` at the boundary.
 */
type ServiceFacade = any;

class Facade {
    /** The container binding key — subclasses override this. */
    static getFacadeAccessor(): string {
        throw new Error('Facade does not implement getFacadeAccessor.');
    }

    static app(): any {
        return Application.getInstance();
    }

    static resolvedInstance(): any {
        return this.app().make(this.getFacadeAccessor());
    }

    // PHP-style `__callStatic` emulation via Proxy (see createFacade).
}

function createFacade(accessor: string): ServiceFacade {
    return new Proxy(
        class {
            static getFacadeAccessor() {
                return accessor;
            }
        },
        {
            get(target: any, property: string | symbol) {
                if (property === 'getFacadeAccessor') return () => accessor;
                if (property === 'swap') {
                    return (instance: any) => target.app().instance(accessor, instance);
                }
                if (property === 'shouldReceive') {
                    // Mocking support: returns a recording proxy.
                    const calls: { method: string | symbol; args: any[] }[] = [];
                    const recorder: any = new Proxy(
                        {},
                        {
                            get(_t: any, method: string | symbol) {
                                return (...args: any[]) => {
                                    calls.push({ method, args });
                                    return recorder; // chainable
                                };
                            },
                        }
                    );
                    recorder.__calls = calls;
                    return recorder;
                }

                const instance = Application.getInstance().make(accessor);
                const value = Reflect.get(instance, property, instance);
                return typeof value === 'function' ? value.bind(instance) : value;
            },

            has(target: any, property: string | symbol): boolean {
                try {
                    const instance = Application.getInstance().make(accessor);
                    return property in instance;
                } catch {
                    return false;
                }
            },
        }
    );
}

module.exports = {
    App: createFacade('app'),
    Route: createFacade('router'),
    DB: createFacade('db'),
    Schema: createFacade('db.schema'),
    Config: createFacade('config'),
    Cache: createFacade('cache'),
    Session: createFacade('session'),
    Auth: createFacade('auth'),
    Crypt: createFacade('encrypter'),
    Hash: createFacade('hash'),
    Log: createFacade('log'),
    Mail: createFacade('mailer'),
    Queue: createFacade('queue'),
    Storage: createFacade('storage'),
    Broadcast: createFacade('broadcast'),
    View: createFacade('view'),
    Validator: createFacade('validator'),
    Event: createFacade('events'),
    Artisan: createFacade('artisan'),
    URL: createFacade('url'),
    RateLimiter: createFacade('ratelimiter'),
};
