# Deployment

- [Introduction](#introduction)
- [Server Requirements](#server-requirements)
    - [Node.js Version](#node-js-version)
    - [Extensions](#extensions)
- [Server Configuration](#server-configuration)
    - [Nginx](#nginx)
- [Optimization](#optimization)
    - [Caching Configuration](#caching-configuration)
    - [Caching Routes And Views](#caching-routes-and-views)
- [Health Routes](#health-routes)
- [Queue Workers](#queue-workers)

<a name="introduction"></a>
## Introduction

After building a Nodevel application you are ready to deploy it to production.

<a name="server-requirements"></a>
## Server Requirements

<a name="node-js-version"></a>
### Node.js Version

Run the same Node.js major version locally and in production. Node 20 LTS or newer is required for `node:sqlite`.

<a name="extensions"></a>
### Extensions

If you deploy with MySQL or PostgreSQL, install `mysql2` or `pg` via npm. The SQLite driver uses Node's built-in `node:sqlite` module.

<a name="server-configuration"></a>
## Server Configuration

<a name="nginx"></a>
### Nginx

Proxy requests to the Nodevel server:

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Start the app under a process manager:

```shell
pm2 start node --name nodevel -- bin/server.js
```

<a name="optimization"></a>
## Optimization

<a name="caching-configuration"></a>
### Caching Configuration

Cache all configuration into one file:

```shell
node artisan config:cache
```

Once cached, only real environment variables are read — `.env` is skipped. Run `config:clear` to remove the cache.

<a name="caching-routes-and-views"></a>
### Caching Routes And Views

```shell
node artisan route:cache
node artisan view:cache
```

Views compile on demand by default; `view:cache` pre-compiles everything.

<a name="health-routes"></a>
## Health Routes

Return a simple JSON heartbeat:

```js
Route.get('/up', () => ({ ok: true }));
```

<a name="queue-workers"></a>
## Queue Workers

Run workers under your process manager too:

```shell
pm2 start node --name nodevel-worker -- bin/artisan.ts queue:work database --tries=3
```

Restart workers during deployment so they pick up new code:

```shell
node artisan queue:restart
```
