'use strict';

const path = require('path');
const fs = require('fs');

const Command = require('./Command');

export {};

/** Parsed option definition from a command signature. */
interface SignatureOptionDef {
    name: string;
    takesValue: boolean;
    defaultValue: string | boolean;
    flagOnly: boolean;
    description: string;
}

/** Parsed argument definition from a command signature. */
interface SignatureArgDef {
    name: string;
    optional: boolean;
    variadic: boolean;
    description: string;
}

/**
 * Structural view of the base command class. The `module.exports`-style
 * module degrades to `any` through `require()`, which would lose the
 * constructor arity when subclasses are declared.
 */
interface CommandCtor {
    new (app: any): any;
    signature: string;
    description: string;
    parseSignature(): { name: string; arguments: SignatureArgDef[]; options: SignatureOptionDef[] };
}

/**
 * The Artisan console application — the equivalent of
 * `Illuminate\Console\Application`. Discovers commands from the framework's
 * `Console/Commands` directory and the application's `app/Console/Commands`.
 */
class Artisan {
    app: any;
    commands: Map<string, CommandCtor>;

    constructor(app: any) {
        this.app = app;
        this.commands = new Map();
    }

    /** Register a command class. */
    add(commandClass: CommandCtor): CommandCtor {
        const { name } = commandClass.parseSignature();
        this.commands.set(name, commandClass);
        return commandClass;
    }

    /** Register many command classes. */
    resolve(classes: Array<CommandCtor>): this {
        for (const cls of classes) this.add(cls);
        return this;
    }

    /**
     * Register a closure-based command — the equivalent of `Artisan::command()`.
     */
    command(signature: string, handler: (...args: any[]) => any, description: string = ''): CommandCtor {
        const Command = require('./Command') as CommandCtor;
        const parts = String(signature).trim().split(/\s+/);
        const name = parts[0];
        const argumentNames: string[] = [];
        for (const match of signature.matchAll(/\{([^}]+)\}/g)) {
            const token = match[1].trim().split(/\s*:\s*/)[0].trim();
            if (!token.startsWith('--')) argumentNames.push(token.replace(/[?*]+$/, ''));
        }
        const ClosureCommand = class extends Command {
            static signature = signature;
            static description = description;
            async handle() {
                const args = argumentNames.map((argName) => this.argument(argName));
                return handler(this, ...args);
            }
        };
        Object.defineProperty(ClosureCommand, 'name', { value: `${name.replace(/\W+/g, '_')}_command` });
        this.commands.set(name, ClosureCommand);
        return ClosureCommand;
    }

    /** Auto-discover command classes from a directory of files. */
    discoverFromDirectory(directory: string): void {
        if (!fs.existsSync(directory)) return;
        for (const file of fs.readdirSync(directory)) {
            if ((!file.endsWith('.ts') && !file.endsWith('.js')) || file === 'index.ts' || file === 'index.js') continue;
            try {
                const loaded = require(path.join(directory, file));
                // Register every exported command class in the module.
                for (const value of Object.values(loaded) as any[]) {
                    if (
                        typeof value === 'function' &&
                        typeof (value as any).parseSignature === 'function' &&
                        value !== Command
                    ) {
                        this.add(value as CommandCtor);
                    }
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error(`Failed to load command ${file}: ${(error as Error).message}`);
            }
        }
    }

    all(): string[] {
        return [...this.commands.keys()].sort();
    }

    /**
     * Run an argv-style input: ['migrate', '--force', '--step=1'].
     * Returns the process exit code.
     */
    async run(argv: string[]): Promise<number> {
        const [name, ...rest] = argv;

        // Global flags.
        const envIndex = rest.indexOf('--env');
        let environment: string | null = null;
        if (envIndex !== -1) {
            environment = rest[envIndex + 1];
            rest.splice(envIndex, 2);
        }
        const versionFlag = rest.includes('--version') || rest.includes('-V');

        if (!name || name === 'list') {
            return this.listCommands(), 0;
        }

        // Built-in help: node artisan help <command>
        if (name === 'help' || name === '--help' || rest.includes('--help')) {
            const target = rest.find((token) => !token.startsWith('-'));
            if (!target) return this.listCommands(), 0;
            const TargetClass = this.commands.get(target);
            if (!TargetClass) {
                console.error(`Command "${target}" is not defined.`);
                return 1;
            }
            this.describeCommand(TargetClass);
            return 0;
        }

        if (versionFlag) {
            console.log('Nodevel Application 1.0.0');
            return 0;
        }

        if (environment) {
            process.env.APP_ENV = environment;
        }

        const CommandClass = this.commands.get(name);
        if (!CommandClass) {
            // eslint-disable-next-line no-console
            console.error(`Command "${name}" is not defined.`);
            return 1;
        }

        if (rest.includes('--help')) {
            this.describeCommand(CommandClass);
            return 0;
        }

        const parsed = parseInput(CommandClass, rest);
        const instance = new CommandClass(this.app);

        try {
            await instance.run({ arguments: parsed.arguments, options: parsed.options, raw: rest });
            return 0;
        } catch (error) {
            instance.error((error as Error)?.stack ? String((error as Error).stack) : String(error));
            return 1;
        }
    }

    listCommands(): void {
        // eslint-disable-next-line no-console
        console.log('\nNodevel Artisan\n');
        // eslint-disable-next-line no-console
        console.log('Usage:\n  artisan <command> [arguments]\n');
        // eslint-disable-next-line no-console
        console.log('Available commands:\n');

        const rows: string[][] = [];
        for (const [name, CommandClass] of [...this.commands.entries()].sort((a, b) =>
            a[0].localeCompare(b[0])
        )) {
            rows.push([`  ${name}`, CommandClass.description || '']);
        }

        const width = Math.max(...rows.map((r) => r[0].length));
        for (const [name, description] of rows) {
            // eslint-disable-next-line no-console
            console.log(`${name.padEnd(width)}  ${description}`);
        }
        // eslint-disable-next-line no-console
        console.log('');
    }

    describeCommand(CommandClass: CommandCtor): void {
        const { name, options: optionDefs, arguments: argDefs } = CommandClass.parseSignature();
        // eslint-disable-next-line no-console
        console.log(`\nDescription:\n  ${CommandClass.description || ''}\n`);
        console.log(`Usage:\n  ${name}${optionDefs.length ? ' [options]' : ''} ${argDefs.map((a) => `<${a.name}>`).join(' ')}\n`);
        if (optionDefs.length) {
            // eslint-disable-next-line no-console
            console.log('Options:');
            for (const option of optionDefs) {
                // eslint-disable-next-line no-console
                console.log(`  --${option.name}${option.takesValue ? '=VALUE' : ''}\t${option.description}`);
            }
            // eslint-disable-next-line no-console
            console.log('');
        }
    }
}

function parseInput(CommandClass: CommandCtor, argv: string[]): {
    arguments: Record<string, any>;
    options: Record<string, any>;
} {
    const sig = CommandClass.parseSignature();
    const argDefs2 = sig.arguments;
    const optionDefs = sig.options;

    const parsedArguments: Record<string, any> = {};
    const parsedOptions: Record<string, any> = {};

    // Initialize defaults.
    for (const option of optionDefs) {
        parsedOptions[option.name] = option.defaultValue || false;
    }

    const positionals: string[] = [];
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];

        if (token.startsWith('--')) {
            const [nameWithDashes, inlineValue] = token.slice(2).split('=');
            const def = optionDefs.find((o) => o.name === nameWithDashes);
            const value =
                inlineValue !== undefined
                    ? inlineValue
                    : def?.takesValue
                        ? argv[++i]
                        : true;
            parsedOptions[nameWithDashes] = value;
            continue;
        }

        if (token.startsWith('-') && token.length > 1 && !token.startsWith('--')) {
            // Short flags map to long names when unique first letters match.
            continue;
        }

        positionals.push(token);
    }

    let positionalIndex = 0;
    for (const argument of argDefs2) {
        if (argument.variadic) {
            parsedArguments[argument.name] = positionals.slice(positionalIndex);
            positionalIndex = positionals.length;
        } else {
            parsedArguments[argument.name] = positionals[positionalIndex++];
        }
    }

    return { arguments: parsedArguments, options: parsedOptions };
}

module.exports = Artisan;
