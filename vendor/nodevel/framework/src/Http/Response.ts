'use strict';

export {};

/**
 * The HTTP response — a port of `Illuminate\Http\Response` and
 * `Illuminate\Http\JsonResponse`.
 */

interface CookieDefinition {
    name: string;
    value: string;
    expires?: Date;
    maxAge?: number;
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
}

class Response {
    content: string | null;
    statusCode: number;
    headers: Record<string, string | string[]>;
    cookies: CookieDefinition[];
    declare streamSource?: AsyncIterable<string | Buffer | Uint8Array> | NodeJS.ReadableStream;

    constructor(content: string | null = '', status: number = 200, headers: Record<string, string | string[]> = {}) {
        this.content = content;
        this.statusCode = status;
        this.headers = { ...headers };
        this.cookies = [];
    }

    // -- Factories ------------------------------------------------------------

    static make(content: string | null = '', status: number = 200, headers: Record<string, string | string[]> = {}): Response {
        return new Response(content, status, headers);
    }

    static json(data: any, status: number = 200, headers: Record<string, string | string[]> = {}): Response {
        const response = new Response(JSON.stringify(data), status, {
            'content-type': 'application/json',
            ...headers,
        });
        return response;
    }

    static noContent(status: number = 204): Response {
        return new Response('', status);
    }

    static redirectTo(path: string, status: number = 302, headers: Record<string, string | string[]> = {}): Response {
        return new Response('', status, { location: path, ...headers });
    }

    /** Create a streamed response from an async iterable or Node stream. */
    static stream(
        streamOrIterable: AsyncIterable<string | Buffer | Uint8Array> | NodeJS.ReadableStream,
        status: number = 200,
        headers: Record<string, string | string[]> = {}
    ): Response {
        const response = new Response(null, status, headers);
        response.streamSource = streamOrIterable;
        return response;
    }

    // -- Mutators ---------------------------------------------------------------

    header(name: string, value: string | string[]): Response {
        this.headers[String(name).toLowerCase()] = value;
        return this;
    }

    withHeaders(headers: Record<string, string>): Response {
        for (const [name, value] of Object.entries(headers)) this.header(name, value);
        return this;
    }

    status(code: number): Response {
        this.statusCode = code;
        return this;
    }

    cookie(name: string, value: string, options: Partial<Omit<CookieDefinition, 'name' | 'value'>> = {}): Response {
        this.cookies.push({ name, value, ...options });
        return this;
    }

    withoutCookie(name: string): Response {
        this.cookies.push({
            name,
            value: '',
            expires: new Date(0),
            path: '/',
        });
        return this;
    }

    // -- Content helpers ----------------------------------------------------------

    setContent(content: string | null): Response {
        this.content = content;
        return this;
    }

    getStatus(): number {
        return this.statusCode;
    }

    getHeaders(): Record<string, string | string[]> {
        const headers = { ...this.headers };
        if (this.cookies.length > 0 && !headers['set-cookie']) {
            headers['set-cookie'] = this.cookies.map(serializeCookie);
        }
        return headers;
    }

    /**
     * Send to a Node ServerResponse.
     */
    send(nodeRes: import('node:http').ServerResponse): import('node:http').ServerResponse {
        nodeRes.writeHead(this.statusCode, this.getHeaders());
        if (this.streamSource) {
            const source = this.streamSource;
            if (typeof source[Symbol.asyncIterator] === 'function') {
                (async () => {
                    for await (const chunk of source) {
                        nodeRes.write(typeof chunk === 'string' ? chunk : Buffer.from(chunk));
                    }
                    nodeRes.end();
                })().catch((e) => nodeRes.destroy(e));
                return nodeRes;
            }
            (source as NodeJS.ReadableStream).pipe(nodeRes);
            return nodeRes;
        }
        nodeRes.end(this.content ?? '');
        return nodeRes;
    }
}

function serializeCookie(cookie: CookieDefinition): string {
    let str = `${cookie.name}=${cookie.value}`;
    str += `; Path=${cookie.path || '/'}`;
    if (cookie.expires) str += `; Expires=${cookie.expires.toUTCString()}`;
    if (cookie.maxAge !== undefined) str += `; Max-Age=${Math.floor(cookie.maxAge / 1000)}`;
    if (cookie.domain) str += `; Domain=${cookie.domain}`;
    if (cookie.httpOnly !== false) str += '; HttpOnly';
    if (cookie.secure) str += '; Secure';
    if (cookie.sameSite) str += `; SameSite=${cookie.sameSite}`;
    else str += '; SameSite=Lax';
    return str;
}

module.exports = Response;
