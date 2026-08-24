'use strict';

/**
 * The service container — a port of `Illuminate\Container\Container`.
 *
 * Supports:
 *   - bind / singleton / scoped / instance bindings
 *   - automatic constructor resolution of concrete classes
 *   - contextual binding (`when(...).needs(...).give(...)`)
 *   - tagging and tagged resolution
 *   - `resolving` callbacks
 */

export {};

type ConcreteResolver = (container: Container, parameters: Record<string, any>) => any;
type Extender = (object: any, container: Container) => any;
type ResolvingCallback = (object: any, container: Container) => void;

/** A class reference that declares its dependencies via `static inject`. */
interface InjectableClass {
    inject?: (string | { key: string; alias: string })[];
    new (...args: any[]): any;
}

interface Binding {
    concrete: ConcreteResolver | InjectableClass | any;
    shared: boolean;
}

class BindingResolutionException extends Error {}

class ContextualBindingBuilder {
    container: Container;
    concrete: any[];
    needsParam: any;
    implementation: any;

    constructor(container: Container, concrete: any) {
        this.container = container;
        this.concrete = Array.isArray(concrete) ? concrete : [concrete];
        this.needsParam = null;
        this.implementation = null;
    }

    needs(abstract: any): this {
        this.needsParam = abstract;
        return this;
    }

    give(implementation: any): Container {
        for (const concrete of this.concrete) {
            const key = `${concrete}|${this.needsParam}`;
            this.container.contextual.set(key, implementation);
        }
        return this.container;
    }

    giveTagged(tag: string): Container {
        return this.give((container: Container) => container.tagged(tag));
    }
}

class Container {
    static instance: Container | null = null;

    /** The globally available container instance. */
    static getInstance(): Container {
        if (!Container.instance) Container.instance = new Container();
        return Container.instance;
    }

    static setInstance(container: Container | null): void {
        Container.instance = container;
    }

    bindings: Map<any, Binding>;
    instances: Map<any, any>;
    scopedInstances: Map<any, any>;
    contextual: Map<string, ConcreteResolver>;
    tags: Map<string, any[]>;
    resolvingCallbacks: Map<any, ResolvingCallback[]>;
    globalResolvingCallbacks: ResolvingCallback[];
    extenders: Map<any, Extender[]>;
    reboundCallbacks: Map<any, ((container: Container, object: any) => void)[]>;
    aliases: Map<any, any>;

    constructor() {
        this.bindings = new Map(); // abstract -> { concrete, shared }
        this.instances = new Map();
        this.scopedInstances = new Map();
        this.contextual = new Map();
        this.tags = new Map();
        this.resolvingCallbacks = new Map();
        this.globalResolvingCallbacks = [];
        this.extenders = new Map();
        this.reboundCallbacks = new Map();
        this.aliases = new Map();
    }

    getAbstract(abstract: any): any {
        return this.aliases.get(abstract) || abstract;
    }

    bound(abstract: any): boolean {
        abstract = this.getAbstract(abstract);
        return this.bindings.has(abstract) || this.instances.has(abstract);
    }

    isShared(abstract: any): boolean {
        abstract = this.getAbstract(abstract);
        return (
            this.instances.has(abstract) ||
            (this.bindings.get(abstract)?.shared ?? false)
        );
    }

    // -- Binding ----------------------------------------------------------------

    bind(abstract: any, concrete: any = null, shared: boolean = false): this {
        if (concrete === null) concrete = abstract;

        abstract = this.getAbstract(abstract);

        // String implementations act as aliases resolved lazily.
        if (typeof concrete === 'string') {
            const target = concrete;
            return this.bind(
                abstract,
                (container: Container) => container.make(target),
                shared
            );
        }

        this.dropStaleInstances(abstract);
        this.bindings.set(abstract, { concrete, shared });
        return this;
    }

    bindIf(abstract: any, concrete: any = null, shared: boolean = false): this {
        if (!this.bound(abstract)) this.bind(abstract, concrete, shared);
        return this;
    }

    singleton(abstract: any, concrete: any = null): this {
        return this.bind(abstract, concrete, true);
    }

    singletonIf(abstract: any, concrete: any = null): this {
        if (!this.bound(abstract)) this.singleton(abstract, concrete);
        return this;
    }

    scoped(abstract: any, concrete: any = null): this {
        return this.singleton(abstract, concrete);
    }

    scopedIf(abstract: any, concrete: any = null): this {
        return this.singletonIf(abstract, concrete);
    }

    /**
     * Bind an interface to an implementation given as a class reference
     * (constructor function or module namespace).
     */
    bindClass(abstract: any, concreteClass: any, shared: boolean = false): this {
        this.bindings.set(this.getAbstract(abstract), {
            concrete: (c: Container) => c.build(concreteClass),
            shared,
        });
        return this;
    }

    extend(abstract: any, closure: Extender): this {
        abstract = this.getAbstract(abstract);
        if (this.instances.has(abstract)) {
            this.instances.set(abstract, closure(this.instances.get(abstract), this));
        } else {
            const list = this.extenders.get(abstract) || [];
            list.push(closure);
            this.extenders.set(abstract, list);
        }
        return this;
    }

    alias(abstract: any, alias: any): this {
        this.aliases.set(alias, abstract);
        return this;
    }

    instance<T = any>(abstract: any, object: T): T {
        abstract = this.getAbstract(abstract);
        this.dropStaleInstances(abstract);
        this.instances.set(abstract, object);
        this.fireReboundCallbacks(abstract, object);
        return object;
    }

    dropStaleInstances(abstract: any): void {
        this.instances.delete(abstract);
    }

    when(concrete: any): ContextualBindingBuilder {
        return new ContextualBindingBuilder(this, concrete);
    }

    tag(abstracts: any, tag: string): this {
        this.tags.set(tag, [...(this.tags.get(tag) || []), ...Arr_wrap(abstracts)]);
        return this;
    }

    tagged(tag: string): any[] {
        const abstracts = this.tags.get(tag) || [];
        return abstracts.map((abstract) => this.make(abstract));
    }

    resolving(abstract: any, callback: ResolvingCallback | null = null): this {
        if (callback === null) {
            this.globalResolvingCallbacks.push(abstract);
            return this;
        }
        abstract = this.getAbstract(abstract);
        const list = this.resolvingCallbacks.get(abstract) || [];
        list.push(callback);
        this.resolvingCallbacks.set(abstract, list);
        return this;
    }

    rebinding(abstract: any, callback: (container: Container, object: any) => void): this {
        abstract = this.getAbstract(abstract);
        const list = this.reboundCallbacks.get(abstract) || [];
        list.push(callback);
        this.reboundCallbacks.set(abstract, list);
        return this;
    }

    fireReboundCallbacks(abstract: any, object: any): void {
        for (const callback of this.reboundCallbacks.get(abstract) || []) {
            callback(this, object);
        }
    }

    // -- Resolution -------------------------------------------------------------

    make<T = any>(abstract: any, parameters: Record<string, any> = {}): T {
        return this.resolve<T>(abstract, parameters);
    }

    makeWith<T = any>(abstract: any, parameters: Record<string, any>): T {
        return this.make<T>(abstract, parameters);
    }

    resolve<T = any>(abstract: any, parameters: Record<string, any> = {}): T {
        abstract = this.getAbstract(abstract);

        if (this.instances.has(abstract)) return this.instances.get(abstract);

        const binding = this.bindings.get(abstract);

        let object: any;
        if (binding) {
            object =
                typeof binding.concrete === 'function'
                    ? binding.concrete(this, parameters)
                    : this.build(binding.concrete, parameters);
        } else {
            object = this.build(abstract, parameters);
        }

        // Apply extenders.
        for (const extender of this.extenders.get(abstract) || []) {
            object = extender(object, this);
        }

        if (this.isShared(abstract) && binding?.shared !== false) {
            if (binding?.shared) this.instances.set(abstract, object);
        }

        this.fireResolvingCallbacks(abstract, object);

        return object;
    }

    build(concrete: any, parameters: Record<string, any> = {}): any {
        if (typeof concrete === 'function') {
            // Distinguish closures from constructors.
            if (!isConstructorLike(concrete)) return concrete(this, parameters);
        }

        if (isModuleNamespace(concrete)) {
            throw new BindingResolutionException(
                'Cannot automatically resolve a CommonJS namespace; register a resolver via bind().'
            );
        }

        if (typeof concrete !== 'function') {
            throw new BindingResolutionException(`Target [${describe(concrete)}] is not instantiable.`);
        }

        return this.constructWithInjection(concrete, parameters);
    }

    /**
     * Instantiate a class, injecting dependencies declared through the
     * `static inject` property — Node's equivalent of PHP constructor
     * type-hints:
     *
     *   class Service {
     *       static inject = ['logger'];
     *       constructor(logger) { ... }
     *   }
     */
    constructWithInjection(concrete: InjectableClass, parameters: Record<string, any> = {}): any {
        const dependencies = concrete.inject || [];

        const resolved = dependencies.map((dependency) => {
            if (typeof dependency === 'object' && dependency !== null) {
                return dependency.key in parameters
                    ? parameters[dependency.key]
                    : this.resolve(dependency.alias, {});
            }
            if (dependency in parameters) return parameters[dependency];
            return this.resolve(dependency);
        });

        return new concrete(...resolved);
    }

    fireResolvingCallbacks(abstract: any, object: any): void {
        for (const callback of this.globalResolvingCallbacks) callback(object, this);
        for (const callback of this.resolvingCallbacks.get(abstract) || []) callback(object, this);
    }

    call(callable: any, parameters: Record<string, any> = {}): any {
        if (typeof callable !== 'function') {
            throw new BindingResolutionException('Container::call expects a function.');
        }
        const dependencies = callable.inject || [];
        const resolved = dependencies.map((d: string) =>
            d in parameters ? parameters[d] : this.resolve(d)
        );
        return callable(...resolved);
    }

    flush(): void {
        this.bindings.clear();
        this.instances.clear();
        this.contextual.clear();
        this.tags.clear();
        this.extenders.clear();
        this.resolvingCallbacks.clear();
        this.reboundCallbacks.clear();
    }
}

function Arr_wrap(value: any): any[] {
    return Array.isArray(value) ? value : [value];
}

/** Heuristic: functions with prototype methods beyond Object are constructors. */
function isConstructorLike(fn: any): boolean {
    if (fn.prototype && Object.getOwnPropertyNames(fn.prototype).length > 1) return true;
    if (/^\s*class\s/.test(String(fn))) return true;
    return false;
}

function isModuleNamespace(value: any): boolean {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.prototype.toString.call(value) === '[object Module]'
    );
}

function describe(value: any): string {
    if (typeof value === 'function') return value.name || 'anonymous';
    return String(value);
}

module.exports = Container;
