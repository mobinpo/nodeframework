'use strict';

const Model = require('@nodevel/framework').Database.Model;

/**
 * The post model.
 */
class Post extends Model {
    static table = 'posts';
    static fillable = ['title', 'body', 'published', 'user_id'];

    async user() {
        return this.belongsTo(require('./User')).first();
    }
}

module.exports = { default: Post, Post };
