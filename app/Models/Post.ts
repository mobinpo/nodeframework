'use strict';

const Model = require('@nodevel/framework').Database.Model;

/**
 * The post model.
 */
class Post extends Model {
    static table: string = 'posts';
    static fillable: string[] = ['title', 'body', 'published', 'user_id'];

    async user(): Promise<any> {
        return this.belongsTo(require('./User')).first();
    }
}

module.exports = { default: Post, Post };

export {};
