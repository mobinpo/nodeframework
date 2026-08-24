'use strict';

const path = require('path');
const { createTestApp } = require('../bootstrap');
const { callTool } = require('../../bin/boost') as { callTool: (name: string, args?: Record<string, any>, basePath?: string) => Promise<any> };

interface TestCase {
    name: string;
    setup?(): Promise<void>;
    fn(): Promise<void>;
}

let ctx: any;
const basePath: string = path.resolve(__dirname, '../..');

module.exports.tests = [
    {
        name: 'boost mcp: application-info and search-docs tools',
        async setup() {
            ctx = ctx || (await createTestApp());
        },
        async fn() {
            const { assertTrue, assertEqual } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const info = await callTool('application-info', {}, basePath);
            assertTrue(info.node_version.startsWith('v'));
            assertEqual(Array.isArray(info.models), true);

            const docs = await callTool('search-docs', { query: 'artisan' }, basePath);
            assertTrue(docs.total_results > 0);
            assertTrue(docs.results.every((r) => r.page && typeof r.line === 'number'));

            let threw = false;
            try {
                await callTool('search-docs', { query: '' }, basePath);
            } catch (error) {
                threw = (error as Error).message.includes('non-empty');
            }
            assertTrue(threw, 'empty query must be rejected');
        },
    },
] as TestCase[];

export {};
