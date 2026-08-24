'use strict';

const fs = require('fs');
const path = require('path');

const Command = require('../Command') as new (app: any) => any;

export {};

/** Accumulated results for a test run. */
interface TestRunResults {
    passed: number;
    failed: number;
    failures: { name: string; error: any }[];
    timings: { name: string; ms: number }[];
}

/**
 * The `test` Artisan command — discovers and runs test files under
 * `tests/Feature` and `tests/Unit`.
 */
class TestCommand extends Command {
    static signature =
        "test {file? : Run a single test file} {--filter= : Filter tests by name substring} {--stop-on-failure} {--parallel : (accepted; Nodevel runs files concurrently by default)} {--profile : Print the slowest tests}";
    static description = 'Run the application tests';

    async handle(): Promise<any> {
        const startedAt = Date.now();
        const results: TestRunResults = { passed: 0, failed: 0, failures: [], timings: [] };

        const files: string[] = [];
        const collectFrom = (dir: string): void => {
            if (!fs.existsSync(dir)) return;
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (entry.isDirectory()) collectFrom(path.join(dir, entry.name));
                else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
                    const full = path.join(dir, entry.name);
                    if (!this.argument('file') || full.endsWith(String(this.argument('file')))) {
                        files.push(full);
                    }
                }
            }
        };
        collectFrom(this.app.basePath('tests'));

        // Run each file sequentially so framework state stays deterministic.
        for (const file of files) {
            const fileStart = Date.now();
            let suite;
            try {
                suite = require(file);
            } catch (error) {
                results.failed++;
                results.failures.push({ name: `${path.basename(file)} (load)`, error });
                continue;
            }

            for (const testCase of suite.tests || []) {
                if (this.option('filter') && !testCase.name.includes(this.option('filter'))) continue;

                const start = Date.now();
                try {
                    if (testCase.setup) await testCase.setup();
                    await testCase.fn();
                    if (testCase.teardown) await testCase.teardown();
                    results.passed++;
                    results.timings.push({ name: testCase.name, ms: Date.now() - start });
                } catch (error) {
                    results.failed++;
                    results.failures.push({ name: testCase.name, error });
                    if (this.option('stop-on-failure')) {
                        return this.report(results, startedAt);
                    }
                }
            }
            void fileStart;
        }

        return this.report(results, startedAt);
    }

    report(results: TestRunResults, startedAt: number): number {
        const durationMs = Date.now() - startedAt;

        for (const failure of results.failures) {
            this.error(`FAILED  ${failure.name}`);
            // eslint-disable-next-line no-console
            console.error(failure.error?.stack ? String(failure.error.stack).split('\n').slice(0, 4).join('\n') : String(failure.error));
        }

        this.line('');
        this.info(
            `Tests:    ${results.passed} passed, ${results.failed} failed`
        );
        this.info(`Duration: ${(durationMs / 1000).toFixed(2)}s`);

        if (this.option('profile')) {
            const slowest = results.timings.sort((a, b) => b.ms - a.ms).slice(0, 10);
            this.table(['Slowest tests', 'ms'], slowest.map((t) => [t.name, t.ms]));
        }

        return results.failed > 0 ? 1 : 0;
    }
}

module.exports = { default: TestCommand, Test: TestCommand };
