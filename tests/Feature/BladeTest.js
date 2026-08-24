'use strict';

const blade = require('@nodevel/blade');

const render = (template, data = {}) =>
    blade.render(template, data, {
        env: { output: () => {} },
        include: async () => '',
        exists: async () => false,
    }).then((scope) => scope.__lastOutput);

module.exports.tests = [
    {
        name: 'blade: echo, escaping, raw output',
        async fn() {
            const { assertEqual } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const out = await capture('Hello, {{ $name }}!', { name: 'World' });
            assertEqual(out, 'Hello, World!');

            const escaped = await capture('{{ $evil }}', { evil: '<script>' });
            assertEqual(escaped, '&lt;script&gt;');

            const raw = await capture('{!! $evil !!}', { evil: '<b>bold</b>' });
            assertEqual(raw, '<b>bold</b>');
        },
    },
    {
        name: 'blade: conditionals and loops',
        async fn() {
            const { assertEqual } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            assertEqual(
                await capture('@if ($ok) yes @else no @endif', { ok: true }),
                ' yes '
            );
            assertEqual(
                await capture(
                    '@foreach ($items as $item){{ $item }}@endforeach',
                    { items: ['a', 'b'] }
                ),
                'ab'
            );
            assertEqual(
                await capture(
                    '@forelse ($items as $item) {{ $item }} @empty none @endforelse',
                    { items: [] }
                ).catch((e) => `ERR:${e.message}`),
                ' none '
            );
        },
    },
    {
        name: 'blade: switch, loops with $loop, stacks',
        async fn() {
            const { assertTrue } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');
            const out = await capture(
                '@switch($n) @case(1) one @break @case(2) two @default other @endswitch',
                { n: 2 }
            );
            assertTrue(out.includes('two'), out);

            const loopOut = await capture(
                '@foreach ($xs as $x)@if (!$loop->first), @endif{{ $x }}@endforeach',
                { xs: ['a', 'b', 'c'] }
            );
            assertIncludes(loopOut, ['a', ', ', 'c']);
        },
    },
];

// -- helpers -------------------------------------------------------------------

async function capture(template, data) {
    let out = '';
    await blade.render(template, data, {
        env: {
            output: (chunk, opts = {}) => {
                out += opts.raw ? String(chunk ?? '') : require('@nodevel/blade/compiler/escape')(chunk);
            },
        },
        include: async () => '',
        exists: () => false,
    });
    return out;
}

function assertIncludes(haystack, needles) {
    for (const needle of needles) {
        if (!haystack.includes(needle)) {
            throw new Error(`Expected "${haystack}" to include "${needle}"`);
        }
    }
}
