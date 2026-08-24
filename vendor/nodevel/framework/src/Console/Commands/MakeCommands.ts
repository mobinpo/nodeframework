'use strict';

const fs = require('fs');
const path = require('path');

const Command = require('../Command') as new (app: any) => any;
const Str = require('../../Support/Str');

export {};

/** Shared stub-writing helper. */
function writeFromStub(app: any, stubName: string, targetPath: string, replacements: Record<string, string>): string {
    const stubPath = path.join(__dirname, '..', 'stubs', `${stubName}.stub`);
    let contents = fs.readFileSync(stubPath, 'utf8');
    for (const [search, replace] of Object.entries(replacements)) {
        contents = contents.split(search).join(replace);
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    if (fs.existsSync(targetPath)) {
        throw new Error(`File already exists: ${targetPath}`);
    }
    fs.writeFileSync(targetPath, contents);
    return targetPath;
}

class MakeControllerCommand extends Command {
    static signature = 'make:controller {name} {--resource : Create a resource controller} {--api : Exclude HTML views} {--r}';
    static description = 'Create a new controller class';

    async handle(): Promise<any> {
        const name = this.argument('name');
        const className = Str.pascal(name.replace(/\.(js|ts)$/, '')) + 'Controller';
        const file = writeFromStub(
            this.app,
            this.option('resource') || this.option('r') ? 'controller.resource' : 'controller.plain',
            this.app.appPath('Http', 'Controllers', `${className}.ts`),
            { '{{class}}': className }
        );
        this.info(`Controller created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeModelCommand extends Command {
    static signature =
        'make:model {name} {--migration : Create a new migration file for the model} {--m} {--factory : Create a new factory} {--f} {--seed : Create a seeder} {--s} {--controller : Create a controller} {--c} {--policy} {--all : All of the above} {--a} {--pivot}';
    static description = 'Create a new Eloquent model class';

    async handle(): Promise<any> {
        const name = this.argument('name');
        const className = Str.pascal(name);
        const table = Str.snake(Str.plural(className));

        const wantsAll = Boolean(this.option('all') || this.option('a'));
        const wantsMigration = wantsAll || this.option('migration') || this.option('m');
        const wantsFactory = wantsAll || this.option('factory') || this.option('f');
        const wantsSeeder = wantsAll || this.option('seed') || this.option('s');
        const wantsController = wantsAll || this.option('controller') || this.option('c');

        const modelFile = writeFromStub(this.app, 'model', this.app.appPath('Models', `${className}.ts`), {
            '{{class}}': className,
            '{{table}}': table,
        });

        if (wantsMigration) {
            await new MakeMigrationCommand(this.app).run({
                arguments: { name: `create_${table}_table` },
                options: { create: true, table },
            });
        }
        if (wantsFactory) {
            await new MakeFactoryCommand(this.app).run({ arguments: { name: className }, options: {} });
        }
        if (wantsSeeder) {
            await new MakeSeederCommand(this.app).run({ arguments: { name: `${className}Seeder` }, options: { model: className } });
        }
        if (wantsController) {
            await new MakeControllerCommand(this.app).run({
                arguments: { name: className },
                options: {},
            });
        }

        this.info(`Model created successfully: ${path.relative(this.app.basePath_, modelFile)}`);
    }
}

function timestamp(): string {
    return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

class MakeMigrationCommand extends Command {
    static signature =
        "make:migration {name : The name of the migration} {--create= : The table to create} {--table= : The table to alter}";
    static description = 'Create a new migration file';

    async handle(): Promise<any> {
        const rawName = this.argument('name');
        const createTable = this.option('create');
        const alterTable = this.option('table');
        const tableName = createTable || alterTable;

        const className = Str.pascal(rawName);
        const fileBase = `${timestamp()}_${Str.snake(rawName)}`;

        let stub: string;
        if (createTable) stub = 'migration.create';
        else if (alterTable) stub = 'migration.alter';
        else stub = rawName.startsWith('create_') ? 'migration.create' : 'migration.blank';

        const file = writeFromStub(this.app, stub, this.app.databasePath('migrations', `${fileBase}.ts`), {
            '{{class}}': className,
            '{{table}}': tableName || 'TABLE_NAME',
        });

        this.info(`Migration created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeSeederCommand extends Command {
    static signature = 'make:seeder {name} {--model=}';
    static description = 'Create a new seeder class';

    async handle(): Promise<any> {
        const name = this.argument('name').endsWith('Seeder')
            ? this.argument('name')
            : `${this.argument('name')}Seeder`;
        const className = Str.pascal(name);
        const model = this.option('model') || className.replace(/Seeder$/, '');

        const file = writeFromStub(this.app, 'seeder', this.app.databasePath('seeders', `${className}.ts`), {
            '{{class}}': className,
            '{{model}}': model,
        });
        this.info(`Seeder created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeFactoryCommand extends Command {
    static signature = 'make:factory {name : The name of the model the factory is for}';
    static description = 'Create a new model factory';

    async handle(): Promise<any> {
        const model = Str.pascal(this.argument('name'));
        const className = `${model}Factory`;

        const file = writeFromStub(this.app, 'factory', this.app.databasePath('factories', `${className}.ts`), {
            '{{class}}': className,
            '{{model}}': model,
        });
        this.info(`Factory created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeRequestCommand extends Command {
    static signature = 'make:request {name}';
    static description = 'Create a new form request class';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name'));
        const file = writeFromStub(this.app, 'request', this.app.appPath('Http', 'Requests', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Form request created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeMiddlewareCommand extends Command {
    static signature = 'make:middleware {name}';
    static description = 'Create a new middleware class';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name'));
        const file = writeFromStub(this.app, 'middleware', this.app.appPath('Http', 'Middleware', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Middleware created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeEventCommand extends Command {
    static signature = 'make:event {name}';
    static description = 'Create a new event class';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name'));
        const file = writeFromStub(this.app, 'event', this.app.appPath('Events', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Event created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeListenerCommand extends Command {
    static signature = 'make:listener {name} {--event= : The event being listened for}';
    static description = 'Create a new event listener class';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name'));
        const event = this.option('event') ? `// Handles: ${this.option('event')}` : '';
        const file = writeFromStub(this.app, 'listener', this.app.appPath('Listeners', `${className}.ts`), {
            '{{class}}': className,
            '{{event}}': event,
        });
        this.info(`Listener created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeJobCommand extends Command {
    static signature = 'make:job {name}';
    static description = 'Create a new queueable job class';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name'));
        const file = writeFromStub(this.app, 'job', this.app.appPath('Jobs', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Job created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeNotificationCommand extends Command {
    static signature = 'make:notification {name}';
    static description = 'Create a new notification class';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name'));
        const file = writeFromStub(this.app, 'notification', this.app.appPath('Notifications', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Notification created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeMailCommand extends Command {
    static signature = 'make:mail {name}';
    static description = 'Create a new email class';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name'));
        const file = writeFromStub(this.app, 'mail', this.app.appPath('Mail', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Mail class created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakePolicyCommand extends Command {
    static signature = 'make:policy {name} {--model=}';
    static description = 'Create a new policy class';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name')).endsWith('Policy')
            ? Str.pascal(this.argument('name'))
            : `${Str.pascal(this.argument('name'))}Policy`;
        const file = writeFromStub(this.app, 'policy', this.app.appPath('Policies', `${className}.ts`), {
            '{{class}}': className,
            '{{model}}': this.option('model') || '',
        });
        this.info(`Policy created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeRuleCommand extends Command {
    static signature = 'make:rule {name}';
    static description = 'Create a new validation rule';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name'));
        const file = writeFromStub(this.app, 'rule', this.app.appPath('Rules', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Rule created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeObserverCommand extends Command {
    static signature = 'make:observer {name} {--model=}';
    static description = 'Create a new observer class';

    async handle(): Promise<any> {
        const base = Str.pascal(this.argument('name'));
        const className = base.endsWith('Observer') ? base : `${base}Observer`;
        const model = this.option('model') || base.replace(/Observer$/, '');
        const file = writeFromStub(this.app, 'observer', this.app.appPath('Observers', `${className}.ts`), {
            '{{class}}': className,
            '{{model}}': model,
        });
        this.info(`Observer created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeScopeCommand extends Command {
    static signature = 'make:scope {name}';
    static description = 'Create a new global scope class';

    async handle(): Promise<any> {
        const base = Str.pascal(this.argument('name'));
        const className = base.endsWith('Scope') ? base : `${base}Scope`;
        const file = writeFromStub(this.app, 'scope', this.app.appPath('Models', 'Scopes', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Scope created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeChannelCommand extends Command {
    static signature = 'make:channel {name}';
    static description = 'Create a new channel class';

    async handle(): Promise<any> {
        const base = Str.pascal(this.argument('name'));
        const className = base.endsWith('Channel') ? base : `${base}Channel`;
        const file = writeFromStub(this.app, 'channel', this.app.appPath('Broadcasting', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Channel created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeComponentCommand extends Command {
    static signature = 'make:component {name} {--view : Create only an anonymous view component} {--inline}';
    static description = 'Create a new view component class';

    async handle(): Promise<any> {
        if (this.option('view')) {
            const name = Str.snake(this.argument('name')).replace(/_/g, '/');
            const file = this.app.resourcePath('views', 'components', `${name}.blade.js`);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, `<div>\n    {{ $slot }}\n</div>\n`);
            this.info(`View component created: ${path.relative(this.app.basePath_, file)}`);
            return;
        }

        const base = Str.pascal(this.argument('name'));
        const className = `${base}Component`;
        const kebabName = Str.kebab(base);

        const classFile = writeFromStub(this.app, 'component.class', this.app.appPath('View', 'Components', `${className}.ts`), {
            '{{class}}': className,
        });
        const viewFile = writeFromStub(
            this.app,
            'component.view',
            this.app.resourcePath('views', 'components', `${kebabName}.blade.js`),
            {}
        );

        this.info(`Component created: ${path.relative(this.app.basePath_, classFile)}`);
        this.info(`View created: ${path.relative(this.app.basePath_, viewFile)}`);
    }
}

class MakeViewCommand extends Command {
    static signature = 'make:view {name}';
    static description = 'Create a new Blade view';

    async handle(): Promise<any> {
        const name = String(this.argument('name')).replace(/\./g, '/');
        const file = this.app.resourcePath('views', `${name}.blade.js`);
        if (fs.existsSync(file)) throw new Error(`View already exists: ${file}`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, '<div>\n\n</div>\n');
        this.info(`View created: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeTestCommand extends Command {
    static signature = 'make:test {name} {--unit : Create a unit test}';
    static description = 'Create a new test class';

    async handle(): Promise<any> {
        const name = this.argument('name').endsWith('Test') ? this.argument('name') : `${this.argument('name')}Test`;
        const directory = this.option('unit') ? 'Unit' : 'Feature';
        const className = Str.pascal(name);

        const file = writeFromStub(this.app, this.option('unit') ? 'test.unit' : 'test.feature',
            this.app.basePath('tests', directory, `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Test created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeClassCommand extends Command {
    static signature = 'make:class {name}';
    static description = 'Create a new plain class';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name'));
        const file = writeFromStub(this.app, 'class', this.app.appPath('Classes', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Class created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeEnumCommand extends Command {
    static signature = 'make:enum {name}';
    static description = 'Create a new enum';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name'));
        const file = writeFromStub(this.app, 'enum', this.app.appPath('Enums', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Enum created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeInterfaceCommand extends Command {
    static signature = 'make:interface {name}';
    static description = 'Create a new interface';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name'));
        const file = writeFromStub(this.app, 'interface', this.app.appPath('Interfaces', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Interface created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

class MakeTraitCommand extends Command {
    static signature = 'make:trait {name}';
    static description = 'Create a new trait';

    async handle(): Promise<any> {
        const className = Str.pascal(this.argument('name'));
        const file = writeFromStub(this.app, 'trait', this.app.appPath('Traits', `${className}.ts`), {
            '{{class}}': className,
        });
        this.info(`Trait created successfully: ${path.relative(this.app.basePath_, file)}`);
    }
}

module.exports = {
    default: MakeModelCommand,
    MakeModel: MakeModelCommand,
    MakeController: MakeControllerCommand,
    MakeMigration: MakeMigrationCommand,
    MakeSeeder: MakeSeederCommand,
    MakeFactory: MakeFactoryCommand,
    MakeRequest: MakeRequestCommand,
    MakeMiddleware: MakeMiddlewareCommand,
    MakeEvent: MakeEventCommand,
    MakeListener: MakeListenerCommand,
    MakeJob: MakeJobCommand,
    MakeNotification: MakeNotificationCommand,
    MakeMail: MakeMailCommand,
    MakePolicy: MakePolicyCommand,
    MakeRule: MakeRuleCommand,
    MakeObserver: MakeObserverCommand,
    MakeScope: MakeScopeCommand,
    MakeChannel: MakeChannelCommand,
    MakeComponent: MakeComponentCommand,
    MakeView: MakeViewCommand,
    MakeTest: MakeTestCommand,
    MakeClass: MakeClassCommand,
    MakeEnum: MakeEnumCommand,
    MakeInterface: MakeInterfaceCommand,
    MakeTrait: MakeTraitCommand,
};
