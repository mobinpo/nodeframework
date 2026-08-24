'use strict';

/**
 * The Nodevel framework entry point.
 *
 * Mirrors the `Illuminate\...` namespace layout of Laravel:
 *
 *   require('@nodevel/framework').Support.Env
 *   require('@nodevel/framework').Routing.Router
 *   ...
 */

export {};

module.exports = {
    // Core kernel
    Application: require('./src/Foundation/Application'),
    ServiceProvider: require('./src/Foundation/Provider'),

    // Support
    Env: require('./src/Support/Env'),
    Config: require('./src/Support/Repository'),
    Collection: require('./src/Support/Collection'),
    Str: require('./src/Support/Str'),
    Arr: require('./src/Support/Arr'),
    helpers: require('./src/Support/helpers'),

    // Container
    Container: require('./src/Container/Container'),

    // Events
    Events: {
        Dispatcher: require('./src/Events/Dispatcher'),
    },

    // HTTP
    Http: {
        Request: require('./src/Http/Request'),
        Response: require('./src/Http/Response'),
        Kernel: require('./src/Foundation/HttpKernel'),
    },

    // Routing
    Routing: {
        Router: require('./src/Routing/Router'),
        Route: require('./src/Routing/Route'),
        UrlGenerator: require('./src/Routing/UrlGenerator'),
    },

    // Views
    View: {
        Factory: require('./src/View/Factory'),
        View: require('./src/View/View'),
    },

    // Database & Eloquent
    Database: {
        DatabaseManager: require('./src/Database/DatabaseManager').DatabaseManager,
        Connection: require('./src/Database/DatabaseManager').Connection,
        Model: require('./src/Database/Eloquent/Model').Model,
        Schema: require('./src/Database/Schema/Builder'),
        Blueprint: require('./src/Database/Schema/Blueprint').Blueprint,
        Migrator: require('./src/Database/Migrations/Migrator'),
    },
    Eloquent: { Model: require('./src/Database/Eloquent/Model').Model },

    // Validation
    Validation: {
        Validator: require('./src/Validation/Validator').Validator,
        FormRequest: require('./src/Validation/FormRequest'),
    },

    // Auth
    Auth: {
        AuthManager: require('./src/Auth/AuthManager').AuthManager,
        Sanctum: require('./src/Auth/AuthManager').Sanctum,
    },

    // Queue
    Queue: {
        QueueManager: require('./src/Queue/QueueManager').QueueManager,
        Worker: require('./src/Queue/Worker').Worker,
    },

    // Console
    Console: {
        Application: require('./src/Console/Application'),
        Command: require('./src/Console/Command'),
    },

    // Support services
    Cache: require('./src/Cache/CacheManager').CacheManager,
    Storage: require('./src/Filesystem/FilesystemManager').FilesystemManager,
    Log: require('./src/Log/LogManager'),
    Crypt: require('./src/Encryption/Encrypter'),
    Hash: require('./src/Hashing/HashManager'),
    Session: require('./src/Session/SessionManager').SessionManager,
    Broadcasting: {
        BroadcastManager: require('./src/Broadcasting/BroadcastManager').BroadcastManager,
        channelRegistry: require('./src/Broadcasting/BroadcastManager').channelRegistry,
        ArrayBroadcaster: require('./src/Broadcasting/BroadcastManager').ArrayBroadcaster,
    },
    Mail: {
        MailManager: require('./src/Mail/Mailer').MailManager,
        Message: require('./src/Mail/Mailer').Message,
    },
    Notification: {
        Notification: require('./src/Notifications/Notification').Notification,
        NotificationSender: require('./src/Notifications/Notification').NotificationSender,
    },

    // Facades
    Facades: require('./src/Facades'),

    // Testing
    Testing: {
        TestCase: require('./src/Foundation/Testing/TestCase'),
    },
};
