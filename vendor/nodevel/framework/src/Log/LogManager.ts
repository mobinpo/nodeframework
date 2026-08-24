'use strict';

const fs = require('fs');
const path = require('path');

export {};

/**
 * Logging — the equivalent of `Illuminate\Log\LogManager` with `single`,
 * `daily`, and `stack` drivers.
 */

type LogLevel = string;
type LogContext = Record<string, any> | null | undefined;

interface LogHandler {
    log(level: LogLevel, message: string, context?: LogContext): void;
}

class SingleHandler implements LogHandler {
    filePath: string;
    level: number;

    constructor(filePath: string, level: string = 'debug') {
        this.filePath = filePath;
        this.level = LEVELS[level] ?? 0;
    }

    log(level: LogLevel, message: string, context?: LogContext): void {
        if ((LEVELS[level] ?? 100) < this.level) return;
        const line = `[${new Date().toISOString()}] ${process.env.NODEVEL_FALLBACK || 'local'}.${level.toUpperCase()}: ${message}`;
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        fs.appendFileSync(this.filePath, line + formatContext(context) + '\n');
    }
}

class DailyHandler extends SingleHandler {
    directory: string;
    days: number;

    constructor(directory: string, days: number = 14, level: string = 'debug') {
        super('', level);
        this.directory = directory;
        this.days = days;
    }

    log(level: LogLevel, message: string, context?: LogContext): void {
        this.filePath = path.join(
            this.directory,
            `nodevel-${new Date().toISOString().slice(0, 10)}.log`
        );
        super.log(level, message, context);
    }
}

class ConsoleHandler implements LogHandler {
    level: number;

    constructor(level: string = 'debug') {
        this.level = LEVELS[level] ?? 0;
    }

    log(level: LogLevel, message: string, context?: LogContext): void {
        if ((LEVELS[level] ?? 100) < this.level) return;
        // eslint-disable-next-line no-console
        console.error(`[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}${formatContext(context)}`);
    }
}

const LEVELS = { debug: 0, info: 1, notice: 2, warning: 3, error: 4, critical: 5, alert: 6, emergency: 7 };

function formatContext(context: LogContext): string {
    if (!context || Object.keys(context).length === 0) return '';
    try {
        return ' ' + JSON.stringify(context);
    } catch {
        return '';
    }
}

/** A logger bound to a channel with PSR-3 style methods. */
class Logger {
    handler: LogHandler;

    constructor(handler: LogHandler) {
        this.handler = handler;
    }

    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context);
    }
    info(message: string, context?: LogContext): void {
        this.log('info', message, context);
    }
    notice(message: string, context?: LogContext): void {
        this.log('notice', message, context);
    }
    warning(message: string, context?: LogContext): void {
        this.log('warning', message, context);
    }
    error(message: string, context?: LogContext): void {
        this.log('error', message, context);
    }
    critical(message: string, context?: LogContext): void {
        this.log('critical', message, context);
    }
    alert(message: string, context?: LogContext): void {
        this.log('alert', message, context);
    }
    emergency(message: string, context?: LogContext): void {
        this.log('emergency', message, context);
    }

    /** Log at a dynamic level. */
    log(level: LogLevel, message: string, context?: LogContext): void {
        this.handler.log(level, message, context);
    }

    /** Attach structured context for the next write. */
    withContext(context: Record<string, any>): Logger {
        const original = this.log.bind(this);
        this.log = (level: LogLevel, message: string, extra: Record<string, any> = {}) => original(level, message, { ...context, ...extra });
        return this;
    }
}

class LogManager {
    app: any;
    channels: Map<string, Logger>;

    constructor(app: any) {
        this.app = app;
        this.channels = new Map();
    }

    channel(name: any = null): Logger {
        name = name || this.app.config('logging.default', 'stack');
        if (this.channels.has(name)) return this.channels.get(name)!;

        const config = this.app.config(`logging.channels.${name}`, null);

        let handler: LogHandler;
        if (config === null) {
            handler = new ConsoleHandler();
        } else if (Array.isArray(config)) {
            // A "stack": an array of channel names.
            const loggers = config.map((channelName) => this.channel(channelName));
            handler = {
                log: (level, message, context) => {
                    for (const logger of loggers) logger.log(level, message, context);
                },
            };
        } else {
            switch (config.driver) {
                case 'single':
                    handler = new SingleHandler(
                        this.app.storagePath('logs/nodevel.log'),
                        config.level || 'debug'
                    );
                    break;
                case 'daily':
                    handler = new DailyHandler(
                        this.app.storagePath('logs'),
                        config.days || 14,
                        config.level || 'debug'
                    );
                    break;
                case 'stderr':
                case 'console':
                    handler = new ConsoleHandler(config.level || 'debug');
                    break;
                default:
                    throw new Error(`Unsupported log driver [${config.driver}].`);
            }
        }

        const logger = new Logger(handler);
        this.channels.set(name, logger);
        return logger;
    }

    // Convenience methods writing to the default channel.
    debug(...args: [string, LogContext?]): void {
        this.channel().debug(...args);
    }
    info(...args: [string, LogContext?]): void {
        this.channel().info(...args);
    }
    warning(...args: [string, LogContext?]): void {
        this.channel().warning(...args);
    }
    error(...args: [string, LogContext?]): void {
        this.channel().error(...args);
    }
}

module.exports = LogManager;
