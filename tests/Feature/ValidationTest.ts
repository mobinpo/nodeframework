'use strict';

const { Validator, ValidationException } = require('@nodevel/framework/src/Validation/Validator');

interface TestCase {
    name: string;
    setup?(): Promise<void>;
    fn(): Promise<void>;
}

module.exports.tests = [
    {
        name: 'validation: passes and fails correctly',
        async fn() {
            const { assertEqual, assertTrue } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const validator = Validator.make(
                { name: 'Taylor', email: 'taylor@example.com', age: 30 },
                { name: 'required|string|max:255', email: 'required|email', age: 'required|integer|min:18' }
            );
            assertTrue(validator.passes(), JSON.stringify(validator.errors()));

            const failing = Validator.make(
                { name: '', email: 'nope' },
                { name: 'required|string', email: 'email' }
            );
            assertTrue(failing.fails());
            assertEqual(failing.errors().name.length, 1);
            assertEqual(failing.errors().email.length, 1);

            // validated() returns only rule-covered keys.
            const good = Validator.make({ a: 1, b: 2 }, { a: 'integer' });
            assertEqual(good.validated(), { a: 1 });

            // validate() throws ValidationException on failure.
            let threw = false;
            try {
                Validator.validate({}, { x: 'required' });
            } catch (error) {
                threw = error instanceof ValidationException && (error as any).status === 422;
            }
            assertTrue(threw);
        },
    },
] as TestCase[];

export {};
