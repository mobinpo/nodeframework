'use strict';

const { Date } = require('../../vendor/nodevel/framework/src/Support/Date');

const {
    assertTrue,
    assertFalse,
    assertEqual,
} = require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

interface TestCase {
    name: string;
    setup?(): Promise<void>;
    fn(): Promise<void> | void;
}

function test(name: string, fn: () => Promise<void> | void): TestCase {
    return { name, async setup() {}, fn };
}

module.exports.tests = [
    test('date: parses, validates and never mutates the original', () => {
        const d = Date.parse('2026-08-24T15:04:05Z');
        const later = d.addDays(1);

        assertTrue(d.day === 24 && d.month === 8 && d.year === 2026);
        assertEqual(later.diffInDays(d), 1);
        assertEqual(d.toISOString(), '2026-08-24T15:04:05.000Z');

        let threw = false;
        try {
            Date.parse('not-a-date');
        } catch (error) {
            threw = error instanceof TypeError;
        }
        assertTrue(threw, 'invalid input should throw TypeError');
    }),

    test('date: month arithmetic clamps overflow like Carbon', () => {
        const jan31 = Date.create(2026, 0, 31);
        const feb = jan31.addMonths(1);
        assertEqual([feb.year, feb.month, feb.day], [2026, 2, 28]);
        assertEqual(jan31.addYears(1).year, 2027);
    }),

    test('date: comparisons and helpers', () => {
        const a = Date.parse('2026-01-01T00:00:00Z');
        const b = Date.parse('2026-02-01T00:00:00Z');

        assertTrue(a.lt(b) && b.gt(a));
        assertTrue(a.isSameDay(Date.parse('2026-01-01T23:59:59Z')));
        assertEqual(a.diffInDays(b), -31);
        assertTrue(Math.abs(a.diffInHours(b)) === 744, 'Jan -> Feb is 744 hours');
        assertTrue(b.min(a).eq(a), 'min returns earlier date');
        assertTrue(b.max(a).eq(b), 'max returns later date');
        assertTrue(typeof a.timestamp === 'number');
        assertFalse(a.isLeapYear());
    }),

    test('date: formatting and JSON serialization', () => {
        const d = Date.create(2026, 7, 24, 15, 4, 5);

        assertEqual(d.format('YYYY-MM-DD'), '2026-08-24');
        assertEqual(d.format('HH:mm:ss'), '15:04:05');
        assertEqual(d.daysInMonth, 31);
        assertEqual(JSON.stringify({ at: d }), JSON.stringify({ at: d.toISOString() }));
    }),
];


export {};
