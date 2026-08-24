'use strict';

export {};

/** Parsed option definition from a command signature. */
interface CommandOptionDefinition {
    name: string;
    takesValue: boolean;
    defaultValue: string | boolean;
    flagOnly: boolean;
    description: string;
}

/** Parsed argument definition from a command signature. */
interface CommandArgumentDefinition {
    name: string;
    optional: boolean;
    variadic: boolean;
    description: string;
}

/** The result of parsing a command `signature` string. */
interface ParsedSignature {
    name: string;
    arguments: CommandArgumentDefinition[];
    options: CommandOptionDefinition[];
}

/** Runtime context handed to Command.run(). */
interface CommandRunContext {
    arguments?: Record<string, any>;
    options?: Record<string, any>;
    raw?: any[];
}

/**
 * The Artisan command base class — the equivalent of
 * `Illuminate\Console\Command`.
 */
class Command {
    /**
     * Subclasses define:
     *   static signature = 'migrate {--force : Run without confirmation}';
     *   static description = 'Run the database migrations';
     */
    static signature = '';
    static description = '';

    app: any;
    inputArguments: Record<string, any>;
    inputOptions: Record<string, any>;
    parsedArgs: any[];

    constructor(app: any) {
        this.app = app;
        this.inputArguments = {};
        this.inputOptions = {};
        this.parsedArgs = [];
    }

    /** Parse `signature` into a name, argument list and option list. */
    static parseSignature(): ParsedSignature {
        const signature = String(this.signature).trim();
        const nameMatch = /^\S+/.exec(signature);
        const name = nameMatch ? nameMatch[0] : '';

        const arguments_: CommandArgumentDefinition[] = [];
        const options: CommandOptionDefinition[] = [];

        for (const match of signature.matchAll(/\{([^}]+)\}/g)) {
            const definition = match[1].trim();
            if (definition.startsWith('--')) {
                const [token, ...descriptionParts] = definition.split(/\s*:\s*/);
                const eqIndex = token.indexOf('=');
                const takesValue = eqIndex !== -1;
                const rawDefault = takesValue ? token.slice(eqIndex + 1).trim() : '';
                const defaultValue = takesValue && rawDefault !== '' ? rawDefault : false;
                const optionName = (takesValue ? token.slice(0, eqIndex) : token).slice(2);
                const description = descriptionParts.join(': ').replace(/=.*$/, '').trim();
                options.push({
                    name: optionName,
                    takesValue,
                    defaultValue,
                    flagOnly: !takesValue,
                    description,
                });
            } else {
                const [token, ...descriptionParts] = definition.split(/\s*:\s*/);
                const trimmed = token.trim();
                arguments_.push({
                    name: trimmed.replace(/[?*]+$/, ''),
                    optional: trimmed.includes('?'),
                    variadic: trimmed.endsWith('*'),
                    description: descriptionParts.join(': ').trim(),
                });
            }
        }

        return { name, arguments: arguments_, options };
    }

    // -- IO helpers -----------------------------------------------------------------

    info(message: string): void {
        // eslint-disable-next-line no-console
        console.log(`\x1b[32m${message}\x1b[0m`);
    }
    error(message: string): void {
        // eslint-disable-next-line no-console
        console.error(`\x1b[31m${message}\x1b[0m`);
    }
    warn(message: string): void {
        // eslint-disable-next-line no-console
        console.warn(`\x1b[33m${message}\x1b[0m`);
    }
    comment(message: string): void {
        this.line(message);
    }
    line(message: string): void {
        // eslint-disable-next-line no-console
        console.log(message);
    }
    table(headers: string[], rows: any[][]): void {
        const widths = headers.map((h, i) =>
            Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length))
        );
        const formatRow = (cells: any[]) =>
            cells.map((cell, i) => String(cell ?? '').padEnd(widths[i])).join('  ');
        this.line(formatRow(headers));
        this.line(widths.map((w) => '-'.repeat(w)).join('  '));
        for (const row of rows) this.line(formatRow(row));
    }
    ask(question: string, defaultAnswer: string = ''): Promise<string> {
        // Non-interactive contexts resolve to the default.
        return Promise.resolve(defaultAnswer);
    }
    confirm(question: string, defaultYes: boolean = true): Promise<boolean> {
        void question;
        return Promise.resolve(defaultYes);
    }
    secret(question: string): Promise<string> {
        void question;
        return Promise.resolve('');
    }

    argument(name: string): any {
        return this.inputArguments[name];
    }
    option(name: string): any {
        return this.inputOptions[name];
    }

    /**
     * Execute — subclasses override with async handle().
     */
    async handle(): Promise<any> {}

    run(context: CommandRunContext): any {
        this.inputArguments = context.arguments || {};
        this.inputOptions = context.options || {};
        this.parsedArgs = context.raw || [];
        return this.handle();
    }
}

module.exports = Command;
