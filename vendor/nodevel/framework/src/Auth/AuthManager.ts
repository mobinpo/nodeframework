'use strict';

export {};

const crypto = require('crypto');

/**
 * Authentication — the equivalent of `Illuminate\Auth` (session guard) plus
 * `Laravel Sanctum` (personal access tokens).
 */

// The application container shared with `Sanctum`'s static API, mirroring
// how Laravel's Sanctum resolves the container via helpers.
let globalApp: any = null;

/** Point Sanctum's static methods at a specific application instance. */
function useApplication(app: any): void {
    globalApp = app;
}

class Guard {
    app: any;
    name: string;
    user_: any;
    resolved: boolean;
    declare tokenAbilities?: string[];

    constructor(app: any, name: string = 'web') {
        if (app) useApplication(app);
        this.app = app;
        this.name = name;
        this.user_ = null;
        this.resolved = false;
    }

    async user(..._args: any[]): Promise<any> {
        if (this.resolved) return this.user_;

        const request = this.app.make('request');
        const session = this.app.make('session');
        const userId = session?.get(`login_web_${this.name}`);

        if (userId) {
            const model = this.userModel();
            this.user_ = await model.query().find(userId);
        } else if (request) {
            // Fall back to a bearer token (Sanctum style) for API clients.
            const token = request.bearerToken();
            if (token) {
                this.user_ = await Sanctum.authenticate(token, this.app);
                if (this.user_) this.tokenAbilities = Sanctum.abilitiesOf(token, this.app);
            }
        }

        this.resolved = true;
        if (request && this.user_) request.setUser(this.user_);
        return this.user_;
    }

    check(): Promise<boolean> {
        return this.user().then((u) => Boolean(u));
    }
    guest(): Promise<boolean> {
        return this.check().then((c) => !c);
    }
    id(): Promise<any> {
        return this.user().then((u) => (u ? u.getKey() : null));
    }

    userModel(): any {
        return this.app.make('auth.model') || requireModel();
    }

    /** Log a user in — stores the id in the session. */
    login(user: any, ..._rest: any[]): void {
        const session = this.app.make('session');
        session.put(`login_web_${this.name}`, user.getKey());
        this.user_ = user;
        this.resolved = true;
    }

    /** Attempt credentials; returns true on success and logs the user in. */
    async attempt(credentials: Record<string, any>, ..._rest: any[]): Promise<boolean> {
        const model = this.userModel();
        const [emailColumn] = Object.keys(credentials).filter((k) => k !== 'password');
        const user = await model.query().where(emailColumn || 'email', credentials[emailColumn || 'email']).first();

        if (!user) return false;

        const hasher = this.app.make('hash');
        if (!(await hasher.check(credentials.password, user.attributes.password))) return false;

        this.login(user);
        return true;
    }

    logout(): void {
        const session = this.app.make('session');
        session.remove(`login_web_${this.name}`);
        this.user_ = null;
        this.resolved = false;
    }
}

function requireModel(): any {
    try {
        return require(process.cwd() + '/app/Models/User.js').default;
    } catch {
        throw new Error('Set the "auth.model" container binding to your User model class.');
    }
}

class AuthManager {
    app: any;
    guards: Map<string, Guard>;

    constructor(app: any) {
        if (app) useApplication(app);
        this.app = app;
        this.guards = new Map();
    }

    guard(name: any = null): Guard {
        name = name || this.app.config('auth.default.guard', 'web');
        if (!this.guards.has(name)) this.guards.set(name, new Guard(this.app, name));
        return this.guards.get(name)!;
    }

    // Convenience pass-throughs to the default guard.
    user(...a: [any?]): Promise<any> {
        return this.guard().user(...a);
    }
    check(): Promise<boolean> {
        return this.guard().check();
    }
    guest(): Promise<boolean> {
        return this.guard().guest();
    }
    id(): Promise<any> {
        return this.guard().id();
    }
    login(...a: [any, ...any[]]): void {
        return this.guard().login(...a);
    }
    attempt(...a: [Record<string, any>, ...any[]]): Promise<boolean> {
        return this.guard().attempt(...a);
    }
    logout(): void {
        return this.guard().logout();
    }

    shouldUse(name: string): void {
        this.app.configRepository?.set?.('auth.default.guard', name);
    }
}

/**
 * Sanctum — personal access tokens with abilities, stored in a database
 * table exactly like Laravel's implementation.
 */
class Sanctum {
    static declare _lastHash?: string;
    static declare _cachedAbilities?: string[];

    static tableName(): string {
        return 'personal_access_tokens';
    }

    /** Issue a new token. Returns `{ token, plainTextToken }`. */
    static async createToken(user: any, name: string = 'default', abilities: string[] = ['*'], expiresAt: Date | null = null): Promise<{ plainTextToken: string }> {
        const db = globalApp.make('db');
        const plainText = `${user.getKey()}|${crypto.randomBytes(20).toString('hex')}`;
        const hash = crypto.createHash('sha256').update(plainText).digest('hex');

        await db.table(Sanctum.tableName()).insert({
            tokenable_type: user.constructor.getTable(),
            tokenable_id: user.getKey(),
            name,
            token: hash,
            abilities: JSON.stringify(abilities),
            expires_at: expiresAt ? format(expiresAt) : null,
            created_at: format(new Date()),
            updated_at: format(new Date()),
        });

        return { plainTextToken: plainText };
    }

    static async authenticate(plainText: string, app: any): Promise<any> {
        if (!plainText) return null;
        const hash = crypto.createHash('sha256').update(plainText).digest('hex');
        const db = app.make('db');

        let record;
        try {
            record = await db.table(Sanctum.tableName()).where('token', hash).first();
        } catch {
            return null;
        }

        if (!record) return null;

        if (
            record.expires_at &&
            new Date(String(record.expires_at).replace(' ', 'T')).getTime() < Date.now()
        ) {
            return null;
        }

        const UserClass = app.make('auth.model');
        return UserClass.query().find(record.tokenable_id);
    }

    static abilitiesOf(plainText: string, app: any): string[] {
        void app;
        const hash = crypto.createHash('sha256').update(plainText).digest('hex');
        Sanctum._lastHash = hash;
        return Sanctum._cachedAbilities || ['*'];
    }

    /** Check an ability on the current request's token. */
    static async tokenCan(user: any, ability: string, app: any): Promise<boolean> {
        const db = app.make('db');
        const request = app.make('request');
        const plainText = request?.bearerToken();
        if (!plainText) return false;

        const hash = crypto.createHash('sha256').update(plainText).digest('hex');
        let record;
        try {
            record = await db.table(Sanctum.tableName()).where('token', hash).first();
        } catch {
            return false;
        }
        if (!record) return false;

        const abilities = JSON.parse(record.abilities || '[]');
        return abilities.includes('*') || abilities.includes(ability);
    }

    static async revokeAllTokensFor(user: any, app: any): Promise<void> {
        await app
            .make('db')
            .table(Sanctum.tableName())
            .where('tokenable_id', user.getKey())
            .delete();
    }
}

function format(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = { AuthManager, Guard, Sanctum, useApplication };
