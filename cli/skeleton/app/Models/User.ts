'use strict';

const Model = require('@nodevel/framework').Database.Model;
const HashManager = require('@nodevel/framework/src/Hashing/HashManager');

/**
 * The application user model — the equivalent of Laravel's `App\Models\User`.
 */
class User extends Model {
    static table: string = 'users';
    static fillable: string[] = ['name', 'email', 'password', 'email_verified_at'];

    /** Attributes hidden from serialization (arrays / JSON). */
    static hiddenFields: string[] = ['password', 'remember_token'];

    async posts(): Promise<any> {
        return this.hasMany(require('./Post')).get();
    }

    /** Hash the password whenever it is set. */
    async save(options?: any): Promise<any> {
        const password = this.attributes.password;
        if (password && !String(password).startsWith('$')) {
            this.attributes.password = await new HashManager().make(password);
        }
        return super.save(options);
    }
}

module.exports = { default: User, User };

export {};
