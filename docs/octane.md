# Octane

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [Performance Guidance](#performance-guidance)

<a name="introduction"></a>
## Introduction

Laravel Octane supercharges application performance by keeping the framework in memory between requests (Swoole / RoadRunner / FrankenPHP).

<a name="nodevel-status"></a>
## Nodevel Status

Not applicable — Node.js already keeps the process and all compiled state (Blade compilation cache, container singletons, config) resident across requests. `node bin/artisan.js serve` boots the framework once and serves every request from warm memory, which is Octane's core benefit by default.

<a name="performance-guidance"></a>
## Performance Guidance

To get the most out of the persistent process:

```shell
node bin/artisan.js optimize        # pre-cache config + compile all views
```

- Compiled Blade bodies are memoized per view with mtime invalidation; `view:cache` pre-warms them at deploy time.
- The container holds singletons (`db`, `cache`, `router`, ...), so per-request work is limited to session + route dispatch.
- For multiple cores, run one server per core behind a load balancer (`APP_PORT=8001 node bin/artisan.js serve`, ...) — Nodevel is stateless apart from storage/ paths.
