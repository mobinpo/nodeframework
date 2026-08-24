'use strict';

const { createTestApp } = require('../bootstrap');

let ctx;

module.exports.tests = [
    {
        name: 'eloquent: relationships, eager loading and soft deletes',
        async setup() {
            ctx = ctx || (await createTestApp());

            const db = ctx.app.make('db');
            await db.statement(`DROP TABLE IF EXISTS "rel_posts"`);
            await db.statement(`DROP TABLE IF EXISTS "rel_comments"`);
            await db.statement(`
                CREATE TABLE "rel_posts" (
                    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                    "title" VARCHAR(255) NOT NULL,
                    "user_id" INTEGER NULL,
                    "created_at" DATETIME NULL,
                    "updated_at" DATETIME NULL,
                    "deleted_at" DATETIME NULL
                )
            `);
            await db.statement(`
                CREATE TABLE "rel_comments" (
                    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                    "body" TEXT,
                    "rel_post_id" INTEGER NULL,
                    "created_at" DATETIME NULL,
                    "updated_at" DATETIME NULL,
                    "deleted_at" DATETIME NULL
                )
            `);
        },
        async fn() {
            const { assertEqual } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const Model =
                require('../../vendor/nodevel/framework/src/Database/Eloquent/Model').Model;
            const { setApplication } =
                require('../../vendor/nodevel/framework/src/Database/Eloquent/Model.js');

            class RelPost extends Model {
                static table = 'rel_posts';
                static fillable = ['title', 'user_id'];
                static softDeletes = true;
                // Relation methods return the relation builder synchronously
                // so the eager loader can inspect them (like Laravel).
                comments() {
                    return this.hasMany(RelComment);
                }
            }
            class RelComment extends Model {
                static table = 'rel_comments';
                static fillable = ['body', 'rel_post_id'];
                post() {
                    return this.belongsTo(RelPost);
                }
            }
            setApplication(ctx.app);

            const post = await RelPost.create({ title: 'parent', user_id: 1 });
            await RelComment.create({ body: 'one', rel_post_id: post.id });
            await RelComment.create({ body: 'two', rel_post_id: post.id });

            // Lazy relation.
            const comments = await post.comments().get();
            assertEqual(comments.length, 2);

            // Eager loading via with().
            const eager = await RelPost.with('comments').where('id', post.id).first();
            assertEqual(eager.comments.length, 2);
            assertEqual(eager.comments.items[0].body, 'one');

            // belongsTo returns a thenable relation — await it directly.
            const child = await RelComment.where('body', 'two').first();
            const parent = await child.post();
            assertEqual(parent.title, 'parent');

            // Soft delete hides from default queries, restores with withTrashed.
            await post.delete();
            assertEqual((await RelPost.where('id', post.id).get()).length, 0);
            const trashed = await RelPost.withTrashed().where('id', post.id).first();
            assertEqual(trashed.id, post.id);
            await trashed.restore();
            assertEqual((await RelPost.where('id', post.id).get()).length, 1);
        },
    },
];
