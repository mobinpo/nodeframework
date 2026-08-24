'use strict';

export {};

/**
 * Ensure email is verified — the equivalent of
 * `Illuminate\Auth\Middleware\EnsureEmailIsVerified`.
 *
 * Rejects requests from authenticated users whose `email_verified_at` is null.
 */

type Next = (request: any) => Promise<any>;

interface Middleware {
    handle(request: any, next: Next): Promise<any>;
}

class EnsureEmailIsVerified implements Middleware {
    async handle(request: any, next: Next): Promise<any> {
        const app = require('../../Foundation/Application').getInstance();
        const user = await app.make('auth').user();

        if (!user) {
            const error = new Error('Unauthenticated.') as Error & { status: number };
            error.status = 401;
            throw error;
        }

        const verified = user.attributes.email_verified_at ?? user.attributes.emailVerifiedAt;
        if (!verified) {
            const error = new Error('Your email address is not verified.') as Error & { status: number };
            error.status = 403;
            throw error;
        }

        return next(request);
    }
}

module.exports = { default: EnsureEmailIsVerified, EnsureEmailIsVerified };
