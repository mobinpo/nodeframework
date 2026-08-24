'use strict';

const Container = require('../../vendor/nodevel/framework/src/Container/Container');
const Collection = require('../../vendor/nodevel/framework/src/Support/Collection');
const Str = require('../../vendor/nodevel/framework/src/Support/Str');

interface TestCase {
    name: string;
    setup?(): Promise<void>;
    fn(): Promise<void>;
}

module.exports.tests = [
    {
        name: 'container: bind, singleton, instance',
        async fn() {
            const { assertEqual, assertTrue } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            const container = new Container();

            class Service {
                static inject: string[] = [];
            }

            container.singleton('svc', () => new Service());
            assertEqual(container.make('svc'), container.make('svc'));

            let count = 0;
            container.bind('counter', () => ++count);
            assertEqual(container.make('counter'), 1);
            assertEqual(container.make('counter'), 2);

            const fixed = {};
            container.instance('fixed', fixed);
            assertEqual(container.make('fixed'), fixed);

            // Interface-style alias binding.
            class Impl {}
            container.bindClass('Contract', Impl);
            assertTrue(container.make('Contract') instanceof Impl);

            // Constructor injection through `static inject`.
            class Dep {}
            class Consumer {
                static inject: string[] = ['dep'];
                dep: any;
                constructor(dep: any) {
                    this.dep = dep;
                }
            }
            container.bindClass('dep', Dep);
            const consumer = container.make(Consumer);
            assertTrue(consumer.dep instanceof Dep);
        },
    },
    {
        name: 'support: collections, strings',
        async fn() {
            const { assertEqual, assertTrue } =
                require('../../vendor/nodevel/framework/src/Foundation/Testing/TestCase');

            assertEqual(
                Collection.make([1, 2, 3]).map((n) => n * 2).filter((n) => n > 2).sum(),
                10
            );
            assertEqual(Collection.make([{ a: 1 }, { a: 2 }]).pluck('a').all(), [1, 2]);
            assertEqual(Collection.times(3, (i) => i).count(), 3);

            assertEqual(Str.camel('hello_world'), 'helloWorld');
            assertEqual(Str.snake('HelloWorld'), 'hello_world');
            assertEqual(Str.kebab('HelloWorld'), 'hello-world');
            assertEqual(Str.pascal('hello-world'), 'HelloWorld');
            assertEqual(Str.plural('category'), 'categories');
            assertEqual(Str.singular('categories'), 'category');
            assertTrue(/^\d{4}-\d{2}-\d{2}$/.test(new Date().toISOString().slice(0, 10)));
        },
    },
] as TestCase[];

export {};
