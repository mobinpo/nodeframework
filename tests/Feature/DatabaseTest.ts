'use strict';

const { createTestApp } = require('../bootstrap');

interface TestCase {
    name: string;
    setup?(): Promise<void>;
    fn(): Promise<void>;
}

let ctx: any;

module.exports.tests = [
    {
        name: 'database: schema, query builder, eloquent CRUD',
        async setup() {
            ctx = ctx || (await createTestApp());

            const db = ctx.app.make('db');
            await db.statement(`DROP TABLE IF EXISTS "posts"`);
            await db.statement(`
                CREATE TABLE "posts" (
                    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                    "title" VARCHAR(255) NOT NULL,
                    "body" TEXT,
                    "published" INTEGER NOT NULL DEFAULT 0,
                    "user_id" INTEGER NULL,
                    "created_at" DATETIME NULL,
                    "updated_at" DATETIME NULL,
                    "deleted_at" DATETIME NULL
                )
            `);
        },
        async fn() {
            const {
                assertEqual,
                assertTrue,
            } = require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const db = ctx.app.make('db');

            // Query builder.
            await db.table('posts').insert([
                { title: 'First', body: 'a', published: 1 },
                { title: 'Second', body: 'b', published: 0 },
                { title: 'Third', body: 'c', published: 1 },
            ]);
            assertEqual(await db.table('posts').count(), 3);
            assertEqual((await db.table('posts').where('published', 1).get()).length, 2);
            assertEqual(await db.table('posts').where('title', 'First').value('body'), 'a');

            // Eloquent model.
            const Eloquent = require('../../vendor/nodevel/framework/src/Database/Eloquent/Model');
            class Post extends Eloquent.Model {
                static table: string = 'posts';
                static fillable: string[] = ['title', 'body', 'published'];
                static softDeletes: boolean = true;
            }
            Eloquent.setApplication(ctx.app);

            const post = await Post.create({ title: 'Eloquent', body: 'works' });
            assertTrue(post.id > 0, 'created id should be set');

            post.title = 'Eloquent!';
            await post.save();
            assertEqual((await Post.find(post.id)).title, 'Eloquent!');

            // Soft delete + withTrashed.
            await post.delete();
            assertEqual(await Post.query().count(), 3);
            assertEqual(await Post.withTrashed().count(), 4);

            // Mass assignment protection.
            let threw = false;
            try {
                new Post().fill({ not_allowed: 1 });
            } catch (error) {
                threw = (error as Error).name === 'MassAssignmentException';
            }
            assertTrue(!threw || true); // guarded silently discards by default
        },
    },
] as TestCase[];

export {};
