'use strict';

export {};

/**
 * URL generation helpers — the equivalent of `Illuminate\Routing\UrlGenerator`
 * and Laravel's `url()` / `route()` / `asset()` / `redirect()` helpers.
 */
class UrlGenerator {
    app: any;
    forcedScheme: string | null;
    forcedRoot: string | null;

    constructor(app: any) {
        this.app = app;
        this.forcedScheme = null;
        this.forcedRoot = null;
    }

    get router(): any {
        return this.app.make('router');
    }

    to(path: string, parameters: Record<string, any> = {}, secure: boolean | null = null): string {
        if (this.isValidUrl(path)) return path;

        const scheme = secure !== null ? (secure ? 'https' : 'http') : this.scheme();
        const base = `${scheme}://${this.rootUrl()}`;
        const url = `${base}/${String(path).replace(/^\//, '')}`;
        const query = new URLSearchParams(
            Object.entries(parameters).filter(([, v]) => v !== undefined && v !== null)
        ).toString();
        return query ? `${url}?${query}` : url;
    }

    route(name: string, parameters: Record<string, any> = {}, absolute: boolean = true): string {
        const path = this.router.urlFor(name, parameters, false);
        return absolute ? this.to(path) : path;
    }

    asset(path: string, secure: boolean | null = null): string {
        if (this.isValidUrl(path)) return path;
        const assetBase = this.app.env('ASSET_URL') || '';
        const clean = String(path).replace(/^\//, '');
        return assetBase
            ? `${String(assetBase).replace(/\/$/, '')}/${clean}`
            : this.to(`/${clean}`, {}, secure);
    }

    current(): string {
        return this.app.make('request')?.fullUrl?.() || this.to('/');
    }

    previous(fallback: string = '/'): string {
        const request = this.app.make('request');
        return request?.header('referer') || fallback;
    }

    scheme(): string {
        if (this.forcedScheme) return this.forcedScheme;
        return 'http';
    }

    rootUrl(): string {
        if (this.forcedRoot) return this.forcedRoot.replace(/^https?:\/\//, '');
        const configured = this.app.config('app.url', 'http://localhost');
        return String(configured).replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    forceScheme(scheme: string): void {
        this.forcedScheme = `${scheme.replace(/:$/, '')}:`;
    }

    forceRootUrl(root: string): void {
        this.forcedRoot = root;
    }

    isValidUrl(path: string): boolean {
        return /^https?:\/\//.test(String(path)) || ['mailto:', 'tel:', '#'].some((p) => String(path).startsWith(p));
    }
}

module.exports = UrlGenerator;
