# Processes

- [Introduction](#introduction)
- [Invoking Processes](#invoking-processes)
- [Process Options](#process-options)

<a name="introduction"></a>
## Introduction

Nodevel wraps Node's `child_process` with a promise-based API for running shell commands from your application.

<a name="invoking-processes"></a>
## Invoking Processes

```js
const { run } = require('@nodevel/framework/src/Support/Process');

const result = await run('ls -la', { cwd: '/var/www' });

result.stdout;  // command output
result.exitCode // 0 on success
```

Throwing variant — rejects with stderr on non-zero exit:

```js
const { runOrFail } = require('@nodevel/framework/src/Support/Process');

const result = await runOrFail('git status --porcelain');
```

<a name="process-options"></a>
## Process Options

| Option | Description                          |
| ------ | ------------------------------------ |
| `cwd`  | Working directory                    |
| `env`  | Extra environment variables          |
| `input`| Stdin content                        |
| `timeout` | Kill after N milliseconds         |

Never pass unsanitized user input into shell strings — prefer argument arrays where supported, or validate strictly at the trust boundary.
