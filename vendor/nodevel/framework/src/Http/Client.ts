'use strict';

export {};

/**
 * The HTTP client — the equivalent of `Illuminate\Support\Facades\Http`
 * (a fluent wrapper around the global `fetch`).
 *
 *   const Http = require('.../Http/Client');
 *   const response = await Http.get('https://example.com/users');
 *   response.ok(); response.status(); response.json();
 */

interface HttpClientOptions {
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
}

class HttpClient {
    baseUrl: string;
    options: { headers: Record<string, string>; timeout: number; retries: number };

    constructor(baseUrl: string = '', options: HttpClientOptions = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.options = {
            headers: {},
            timeout: 30_000,
            retries: 1,
            ...options,
        };
    }

    /** Set a base URL for relative requests. */
    static baseUrl(url: string): HttpClient {
        return new HttpClient(url);
    }

    withHeaders(headers: Record<string, string>): HttpClient {
        const client = this.clone();
        Object.assign(client.options.headers, headers);
        return client;
    }

    withToken(token: string, type: string = 'Bearer'): HttpClient {
        return this.withHeaders({ authorization: `${type} ${token}` });
    }

    acceptJson(): HttpClient {
        return this.withHeaders({ accept: 'application/json' });
    }

    timeout(seconds: number): HttpClient {
        const client = this.clone();
        client.options.timeout = seconds * 1000;
        return client;
    }

    clone(): HttpClient {
        const client = new HttpClient(this.baseUrl, { ...this.options });
        client.options.headers = { ...this.options.headers };
        return client;
    }

    buildUrl(url: string): string {
        return url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    }

    async request(method: string, url: string, body: unknown = null): Promise<HttpResponse> {
        const target = this.buildUrl(url);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.options.timeout);
        try {
            const response = await fetch(target, {
                method: method.toUpperCase(),
                headers: { ...this.options.headers },
                body:
                    body === null
                        ? undefined
                        : typeof body === 'string'
                            ? body
                            : JSON.stringify(body),
                signal: controller.signal,
            });
            return new HttpResponse(response);
        } finally {
            clearTimeout(timer);
        }
    }

    get(url: string): Promise<HttpResponse> {
        return this.request('GET', url);
    }
    post(url: string, body: unknown): Promise<HttpResponse> {
        return this.request('POST', url, body);
    }
    put(url: string, body: unknown): Promise<HttpResponse> {
        return this.request('PUT', url, body);
    }
    patch(url: string, body: unknown): Promise<HttpResponse> {
        return this.request('PATCH', url, body);
    }
    delete(url: string): Promise<HttpResponse> {
        return this.request('DELETE', url);
    }
}

/** The response envelope — mirrors Laravel's `Illuminate\Client\Response`. */
class HttpResponse {
    response: globalThis.Response;

    constructor(response: globalThis.Response) {
        this.response = response;
    }

    status(): number {
        return this.response.status;
    }
    ok(): boolean {
        return this.response.ok;
    }
    successful(): boolean {
        return this.response.status >= 200 && this.response.status < 300;
    }
    serverError(): boolean {
        return this.response.status >= 500;
    }
    clientError(): boolean {
        return this.response.status >= 400 && this.response.status < 500;
    }
    headers(): Record<string, string> {
        return Object.fromEntries(this.response.headers.entries());
    }

    async body(): Promise<string> {
        return this.response.text();
    }
    async json(): Promise<any> {
        return this.response.json();
    }

    /** Throw on 4xx / 5xx — the equivalent of `$response->throw()`. */
    async throw(): Promise<this> {
        if (!this.response.ok) {
            const error = new Error(
                `HTTP request returned status ${this.response.status}.`
            ) as Error & { status: number; response: HttpResponse };
            error.status = this.response.status;
            error.response = this;
            throw error;
        }
        return this;
    }
}

module.exports = { default: HttpClient, HttpClient, HttpResponse };
