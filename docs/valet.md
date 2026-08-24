# Valet

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)

<a name="introduction"></a>
## Introduction

Laravel Valet is a minimal development environment for macOS: park a directory, and every application inside it is served automatically on a `.test` domain.

<a name="nodevel-status"></a>
## Nodevel Status

Not applicable — Nodevel applications are self-serving. The framework ships its own HTTP server, so no PHP runtime, Nginx, or dnsmasq is required:

```shell
node bin/artisan.js serve                # http://127.0.0.1:8000
APP_PORT=3000 node bin/artisan.js serve  # custom port
```

To approximate "parked" directories on your machine, run one server per project (each binds its own port) and put a reverse proxy in front for pretty hostnames:

```shell
cd ~/sites/blog && node bin/artisan.js serve --port=8001 &
cd ~/site/shop  && node bin/artisan.js serve --port=8002 &
```

For production deployments see [deployment](/framework/docs/deployment); the application runs behind any process supervisor with `node bin/artisan.js serve` as the start command.
