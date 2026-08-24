# Browser Testing (Dusk)

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Browser Testing Alternatives](#alternatives)

<a name="introduction"></a>
## Introduction

Laravel Dusk provides browser automation and end-to-end testing with a fluent API on top of ChromeDriver.

<a name="nodevel-status"></a>
## Nodevel Status

Not implemented. Nodevel's built-in `TestCommand` runs fast in-process HTTP tests (`ctx.get()`, `ctx.postJson()`, assertions like `assertSee`, `assertJsonPath`) without a browser.

<a name="alternatives"></a>
## Browser Testing Alternatives

For JavaScript-rendered flows, drive a real browser against a running Nodevel server using Playwright:

```shell
npm install --save-dev playwright
```

```js
// tests/Browser/WelcomeTest.js (run with your own runner, e.g. `node tests/browser.js`)
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:8000/');
    if (!(await page.content()).includes('Nodevel')) throw new Error('welcome page failed');
    await browser.close();
})();
```

Start the app first with `npx tsx bin/artisan.ts serve` (or use `handleRequestServer(basePath)` programmatically inside a test bootstrap to bind an ephemeral port).
