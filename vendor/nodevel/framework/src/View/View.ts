'use strict';

export {};

/**
 * A rendered view instance — the equivalent of `Illuminate\View\View`.
 */
class View {
    factory: any;
    view_: string;
    path_: string;
    data: Record<string, any>;

    constructor(factory: any, name: string, path: string, data: Record<string, any> = {}) {
        this.factory = factory;
        this.view_ = name;
        this.path_ = path;
        this.data = { ...data };
    }

    /** Add a piece of data to the view. */
    with(keyOrData: Record<string, any> | string, value: any = undefined): View {
        if (typeof keyOrData === 'object') Object.assign(this.data, keyOrData);
        else this.data[keyOrData] = value;
        return this;
    }

    name(): string {
        return this.view_;
    }

    file(): string {
        return this.path_;
    }

    /**
     * Render synchronously from pre-compiled template source.
     */
    render(): string {
        return this.factory.renderCompiledSync(this);
    }

    async renderAsync(): Promise<string> {
        return this.factory.renderAsync(this);
    }

    /** Async response conversion — rendering is async in Nodevel. */
    toResponse(): Promise<any> {
        const Response = require('../Http/Response');
        return this.factory.renderAsync(this).then((html: string) =>
            Response.make(html, 200, { 'content-type': 'text/html' })
        );
    }

    toString(): string {
        throw new Error(
            'String coercion requires a rendered result. Use `await view.renderAsync()`.'
        );
    }
}

module.exports = View;
