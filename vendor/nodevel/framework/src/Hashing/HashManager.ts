'use strict';

const crypto = require('crypto');

export {};

interface HashConfig {
    default?: string;
    bcrypt?: { rounds?: number };
}

/**
 * Password hashing — the equivalent of `Illuminate\Hashing` (bcrypt driver).
 * Node's built-in scrypt is used as the default; bcrypt is supported via an
 * installed `bcryptjs` package.
 */
class BcryptHasher {
    rounds: number;

    constructor(rounds: number = 10) {
        this.rounds = rounds;
    }

    async make(value: string): Promise<string> {
        try {
            const bcrypt = require('bcryptjs');
            return await bcrypt.hash(value, this.rounds);
        } catch {
            // Fall back to a salted SHA-512 digest when bcryptjs is absent.
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.scryptSync(String(value), salt, 32).toString('hex');
            return `$scrypt$${salt}$${hash}`;
        }
    }

    async check(value, hashedValue) {
        if (hashedValue.startsWith('$scrypt$')) {
            const [, , salt, expected] = hashedValue.split('$');
            const actual = crypto.scryptSync(String(value), salt, 32).toString('hex');
            return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
        }
        const bcrypt = require('bcryptjs');
        return bcrypt.compare(value, hashedValue);
    }
}

class HashManager {
    drivers: Map<string, BcryptHasher>;
    defaultDriver: string;
    config: HashConfig;

    constructor(config: HashConfig = {}) {
        this.drivers = new Map();
        this.defaultDriver = config.default || 'bcrypt';
        this.config = config;
    }

    driver(name: string | null = null): BcryptHasher {
        name = name || this.defaultDriver;
        if (!this.drivers.has(name)) {
            if (name === 'bcrypt') {
                this.drivers.set(name, new BcryptHasher(this.config.bcrypt?.rounds ?? 10));
            } else {
                throw new Error(`Unsupported hash driver [${name}].`);
            }
        }
        return this.drivers.get(name)!;
    }

    async make(value: string): Promise<string> {
        return this.driver().make(value);
    }

    async check(value: string, hashedValue: string): Promise<boolean> {
        return this.driver().check(value, hashedValue);
    }
}

module.exports = HashManager;
