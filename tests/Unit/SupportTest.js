'use strict';

/**
 * A unit test file — no framework boot required.
 */

const Env = require('../../vendor/nodevel/framework/src/Support/Env');
const Arr = require('../../vendor/nodevel/framework/src/Support/Arr');

module.exports.tests = [
    {
        name: 'env: casts reserved values',
        async fn() {
            const { assertEqual } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const parsed = [
                ['true', true],
                ['false', false],
                ['null', null],
                ['empty', ''],
            ];
            for (const [raw, expected] of parsed) {
                assertEqual(Env.castValue(raw), expected);
            }
            assertEqual(Arr.get({ a: { b: { c: 7 } } }, 'a.b.c'), 7);
            assertEqual(Arr.get({}, 'missing', 'fallback'), 'fallback');
        },
    },
];
