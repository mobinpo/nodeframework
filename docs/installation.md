# Installation

- [Meet Nodevel](#meet-nodevel)
    - [Why Nodevel?](#why-nodevel)
- [Creating a Nodevel Application](#creating-a-nodevel-application)
    - [Installing Node.js and the Nodevel Installer](#installing-node)
    - [Creating an Application](#creating-an-application)
- [Initial Configuration](#initial-configuration)
    - [Environment Based Configuration](#environment-based-configuration)
    - [Databases and Migrations](#databases-and-migrations)
    - [Directory Configuration](#directory-configuration)
- [Next Steps](#next-steps)
    - [Nodevel the Full Stack Framework](#nodevel-the-fullstack-framework)
    - [Nodevel the API Backend](#nodevel-the-api-backend)

<a name="meet-nodevel"></a>
## Meet Nodevel

Nodevel is a web application framework with expressive, elegant syntax for Node.js. A web framework provides a structure and starting point for creating your application, allowing you to focus on creating something amazing while we sweat the details.

Nodevel strives to provide an amazing developer experience while providing powerful features such as a thorough service container, an expressive database abstraction layer (Eloquent), queues, unit and integration testing, Blade templating, Artisan commands, and more.

Whether you are new to web frameworks or have years of experience, Nodevel is a framework that can grow with you.

<a name="why-nodevel"></a>
### Why Nodevel?

#### A Progressive Framework

Nodevel grows with you. If you're just taking your first steps into web development, Nodevel's documentation will help you learn the ropes without becoming overwhelmed. If you're a senior developer, Nodevel gives you robust tools for dependency injection, testing, queues, real-time events, and more.

#### A Scalable Framework

Nodevel is incredibly scalable. Thanks to Node's event-driven architecture and Nodevel's built-in support for fast cache systems like Redis, horizontal scaling with Nodevel is a breeze.

#### An Agent Ready Framework

Nodevel's opinionated conventions and well-defined structure make it an ideal framework for AI assisted development using tools like Cursor and Claude Code. When you ask an AI agent to add a controller, it knows exactly where to place it.

<a name="creating-a-nodevel-application"></a>
## Creating a Nodevel Application

<a name="installing-node"></a>
### Installing Node.js and the Nodevel Installer

Before creating your first Nodevel application, make sure your local machine has [Node.js](https://nodejs.org) (18+) and NPM installed:

```shell
node -v
npm -v
```

If you already have a Nodevel application skeleton (as in this repository), the framework is vendored under `vendor/nodevel` and requires no additional installation — just run `npm install`.

<a name="creating-an-application"></a>
### Creating an Application

Once dependencies are installed, you can start Nodevel's local development server:

```shell
npm install
npx tsx bin/artisan.ts serve
```

Or via npm:

```shell
npm run artisan -- serve
```

Once you have started the development server, you can access your application in your web browser at [http://localhost:8000](http://localhost:8000). Of course, you may also want to [configure a database](#databases-and-migrations) and run the necessary migrations.

<a name="initial-configuration"></a>
## Initial Configuration

All configuration files for the Nodevel framework are stored in the `config` directory. Each option is documented, so feel free to look through the files and get familiar with the options available to you.

Nodevel needs almost no additional configuration out of the box. You are free to get started developing! However, you may wish to review the `config/app.js` file and its documentation. It contains several options such as `url` and `locale` that you may wish to change according to your application.

<a name="environment-based-configuration"></a>
### Environment Based Configuration

Since many of Nodevel's configuration option values may vary depending on whether your application is running on your local machine or on a production web server, many important configuration values are defined using the `.env` file that exists at the root of your application.

Your `.env` file should not be committed to your application's source control, since each developer / server using your application could require a different environment configuration. Furthermore, this would be a security risk in the event an intruder gains access to your source control repository, since any sensitive credentials would be exposed.

<a name="databases-and-migrations"></a>
### Databases and Migrations

Now that you have created your Nodevel application, you probably want to store some data in a database. By default, your application's `.env` configuration file specifies that Nodevel will be interacting with an SQLite database at `database/database.sqlite`.

If you prefer to use another database driver such as MySQL or PostgreSQL, you can update your `.env` configuration file to use the appropriate database. For example, if you wish to use MySQL, update your `.env` configuration file's `DB_*` variables like so:

```ini
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nodevel
DB_USERNAME=root
DB_PASSWORD=
```

Then install the corresponding driver package (`mysql2` for MySQL/MariaDB, `pg` for PostgreSQL) and run your application's database migrations:

```shell
npx tsx bin/artisan.ts migrate
```

<a name="directory-configuration"></a>
### Directory Configuration

In production, serve the application behind a reverse proxy (Nginx, Caddy) pointed at the port given by `APP_PORT`. Never expose the project root directly; only the Node process needs to reach application files.

<a name="next-steps"></a>
## Next Steps

Now that you have created your Nodevel application, you may be wondering what to learn next. First, we strongly recommend becoming familiar with how Nodevel works by reading the following documentation:

<div class="content-list" markdown="1">

- [Request Lifecycle](lifecycle.md)
- [Configuration](configuration.md)
- [Directory Structure](structure.md)
- [Frontend](frontend.md)
- [Service Container](container.md)
- [Facades](facades.md)

</div>

How you want to use Nodevel will also dictate the next steps on your journey.

<a name="nodevel-the-fullstack-framework"></a>
### Nodevel the Full Stack Framework

Nodevel may serve as a full stack framework. By "full stack" framework we mean that you are going to use Nodevel to route requests to your application and render your frontend via [Blade templates](blade.md).

If this is how you plan to use Nodevel, you may want to check out our documentation on [routing](routing.md), [views](views.md), or the [Eloquent ORM](eloquent.md).

<a name="nodevel-the-api-backend"></a>
### Nodevel the API Backend

Nodevel may also serve as an API backend to a JavaScript single-page application or mobile application. In this context, you may use Nodevel to provide [authentication](sanctum.md) and data storage / retrieval for your application, while also taking advantage of Nodevel's powerful services such as [queues](queues.md), emails, notifications, and more.
