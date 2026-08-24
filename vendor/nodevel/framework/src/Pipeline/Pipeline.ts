'use strict';

/**
 * The middleware pipeline — a port of `Illuminate\Pipeline\Pipeline`.
 */

export {};

type Next = () => Promise<any>;
type PipeHandler = (request: any, next: Next) => any;

class Pipeline {
    containerRef: any;
    passable: any;
    pipes: any[];
    methodName?: string;

    constructor(container: any = null) {
        this.containerRef = container;
        this.passable = null;
        this.pipes = [];
    }

    static send(passable: any, container: any = null): Pipeline {
        return new Pipeline(container).send(passable);
    }

    send(passable: any): this {
        this.passable = passable;
        return this;
    }

    through(pipes: any): this {
        this.pipes = Array.isArray(pipes) ? pipes : [pipes];
        return this;
    }

    via(method: string): this {
        this.methodName = method;
        return this;
    }

    async then(destination: Next): Promise<any> {
        const pipeline = [...this.pipes].reverse().reduce(
            (next: Next, pipe: any) => {
                return async () => {
                    const handler = await this.resolvePipe(pipe);
                    return handler(this.passable, next);
                };
            },
            destination
        );

        try {
            return await pipeline();
        } catch (error: any) {
            if (error && error.__missing__) {
                // A route's `missing` handler was triggered.
                const request = this.passable;
                return error.__missing__(request);
            }
            throw error;
        }
    }

    async resolvePipe(pipe: any): Promise<PipeHandler> {
        if (typeof pipe === 'function') return pipe;

        if (typeof pipe === 'string') {
            // Support `alias:param` syntax.
            let name = pipe;
            let parameters: string[] = [];
            if (pipe.includes(':')) {
                const [n, p] = pipe.split(':');
                name = n;
                parameters = p.split(',');
            }

            let resolved: any;
            if (
                this.containerRef &&
                typeof this.containerRef.bound === 'function' &&
                this.containerRef.bound(`middleware.${name}`)
            ) {
                resolved = this.containerRef.make(`middleware.${name}`);
            } else {
                resolved = requirePipe(name);
            }

            if (resolved === undefined || resolved === null) {
                throw new Error(`Middleware "${name}" is not resolvable.`);
            }

            if (parameters.length > 0 && typeof resolved === 'function') {
                return (request: any, next: Next) => resolved(request, next, ...parameters);
            }
            if (resolved && typeof resolved.handle === 'function') {
                return (request: any, next: Next) => resolved.handle(request, next);
            }
            if (typeof resolved === 'function') return resolved;

            throw new Error(`Middleware "${name}" is not resolvable.`);
        }

        // Class reference with a handle method.
        if (pipe && typeof pipe.handle === 'function') {
            return (request: any, next: Next) => pipe.handle(request, next);
        }

        throw new Error(`Unknown middleware: ${String(pipe)}`);
    }
}

function requirePipe(name: string): any {
    // Framework built-ins live in `src/Http/Middleware`.
    try {
        return require(`../Http/Middleware/${Str_pascal(name)}`);
    } catch {
        return undefined;
    }
}

function Str_pascal(value: string): string {
    return String(value)
        .split(/[-_.]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

module.exports = Pipeline;
