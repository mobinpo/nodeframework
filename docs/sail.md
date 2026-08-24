# Sail (Docker Development)

- [Introduction](#introduction)
- [Nodevel Status](#nodevel-status)
- [A Minimal Nodevel Dev Container](#a-minimal-dev-container)

<a name="introduction"></a>
## Introduction

Laravel Sail is a light-weight command-line interface for interacting with Laravel's default Docker development environment.

<a name="nodevel-status"></a>
## Nodevel Status

Not bundled. A Nodevel application needs only Node and, for the default SQLite driver, nothing else — most teams don't require containers at all. When you do (MySQL/Postgres/Redis locally), plain Docker Compose covers it.

<a name="a-minimal-dev-container"></a>
## A Minimal Nodevel Dev Container

```yaml
# docker-compose.yml
services:
    app:
        image: node:22
        working_dir: /app
        volumes: [".:/app"]
        command: npm run artisan -- serve --port=8000
        ports: ["8000:8000"]

    mysql:
        image: mysql:9
        environment:
            MYSQL_DATABASE: nodevel
            MYSQL_ROOT_PASSWORD: secret
        ports: ["3306:3306"]
```

```ini
# .env
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=nodevel
DB_USERNAME=root
DB_PASSWORD=secret
```

Then:

```shell
docker compose up -d
docker compose exec app npm install
docker compose exec app npm run artisan -- migrate
```

All Artisan commands work identically inside the container via `npm run artisan -- <command>`.
