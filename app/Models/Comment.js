'use strict';

const Model = require('@nodevel/framework').Database.Model;

/**
 * The comment model — a polymorphic child of posts and other entities.
 */
class Comment extends Model {
    static table = 'comments';
    static fillable = ['body', 'commentable_type', 'commentable_id'];
}

module.exports = { default: Comment, Comment };
