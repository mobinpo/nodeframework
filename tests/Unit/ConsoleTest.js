'use strict';

/**
 * Console layer unit tests: signature parsing and closure commands.
 */

const Command = require('../../vendor/nodevel/framework/src/Console/Command');

module.exports.tests = [
    {
        name: 'console: parses signatures with descriptions containing spaces',
        async fn() {
            const { assertEqual, assertTrue } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            class Serve extends Command {
                static signature = 'serve {--port= : The port to serve the application on}';
            }
            const sig = Serve.parseSignature();
            assertEqual(sig.name, 'serve');
            assertEqual(sig.options.length, 1);
            assertEqual(sig.options[0].name, 'port');
            assertTrue(sig.options[0].takesValue, 'port should take a value');
            assertEqual(sig.options[0].description, 'The port to serve the application on');

            class Make extends Command {
                static signature =
                    'make:controller {name : The controller name} {--resource : Create a resource controller} {--api}';
            }
            const makeSig = Make.parseSignature();
            assertEqual(makeSig.arguments.length, 1);
            assertEqual(makeSig.arguments[0].name, 'name');
            assertEqual(makeSig.arguments[0].description, 'The controller name');
            assertEqual(makeSig.options.length, 2);
            assertEqual(makeSig.options[1].name, 'api');

            class Retry extends Command {
                static signature = 'queue:retry {id* : The ID of the failed job(s)}';
            }
            assertTrue(Retry.parseSignature().arguments[0].variadic);
        },
    },
    {
        name: 'console: cron matcher matches Laravel-style expressions',
        async fn() {
            const { assertEqual } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');
            const { cronMatches } = require('../../vendor/nodevel/framework/src/Schedule/Schedule');

            // 2026-08-23 is a Sunday.
            const at = (iso) => new Date(iso);
            assertEqual(cronMatches('* * * * *', at('2026-08-23T10:30:00Z')), true);
            assertEqual(cronMatches('30 10 * * *', at('2026-08-23T10:30:00Z')), true);
            assertEqual(cronMatches('45 10 * * *', at('2026-08-23T10:30:00Z')), false);
            assertEqual(cronMatches('*/15 * * * *', at('2026-08-23T10:45:00Z')), true);
            assertEqual(cronMatches('*/15 * * * *', at('2026-08-23T10:40:00Z')), false);
            assertEqual(cronMatches('* * * * 0', at('2026-08-23T10:30:00Z')), true);
            assertEqual(cronMatches('0 2 1 * *', at('2026-08-01T02:00:00Z')), true);
            assertEqual(cronMatches('0 2 1,15 * *', at('2026-08-15T02:00:00Z')), true);
        },
    },
];
