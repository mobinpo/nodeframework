'use strict';

export {};

/**
 * Schema blueprint — the equivalent of `Illuminate\Database\Schema\Blueprint`.
 *
 * Columns are declared fluently and compiled to SQL per driver.
 */

/** Minimal structural view of a connection, for driver detection only. */
interface CompilerConnection {
    client?: { kind?: string } | null;
    config?: { driver?: string } | null;
}

class ColumnDefinition {
    name: string;
    type: string;
    length_: number | null;
    nullable_: boolean;
    defaultValue: any;
    unsigned_: boolean;
    primary_: boolean;
    unique_: boolean;
    index_: boolean;
    autoIncrement_: boolean;
    afterColumn: string | null;
    comment_: string | null;
    precision: number | null;
    places: number | null;
    enumValues: any;

    constructor(name: string, type: string) {
        this.name = name;
        this.type = type;
        this.length_ = null;
        this.nullable_ = false;
        this.defaultValue = undefined;
        this.unsigned_ = false;
        this.primary_ = false;
        this.unique_ = false;
        this.index_ = false;
        this.autoIncrement_ = false;
        this.afterColumn = null;
        this.comment_ = null;
        this.precision = null;
        this.places = null;
        this.enumValues = null;
    }

    nullable(value: boolean = true): this {
        this.nullable_ = value;
        return this;
    }
    default(value: any): this {
        if (value && typeof value === 'object' && value.isExpression) {
            this.defaultValue = { expression: value.value };
        } else {
            this.defaultValue = value;
        }
        return this;
    }
    unsigned(): this {
        this.unsigned_ = true;
        return this;
    }
    primary(): this {
        this.primary_ = true;
        return this;
    }
    unique(): this {
        this.unique_ = true;
        return this;
    }
    index(): this {
        this.index_ = true;
        return this;
    }
    autoIncrement(): this {
        this.autoIncrement_ = true;
        return this;
    }
    comment(text: string): this {
        this.comment_ = text;
        return this;
    }
}

class Expression {
    value: any;
    isExpression: boolean;

    constructor(value: any) {
        this.value = value;
        this.isExpression = true;
    }
}

class ForeignKeyDefinition {
    columns: string[];
    referenceColumns: string[];
    referenceTable: string | null;
    onDeleteAction: string | null;
    onUpdateAction: string | null;
    constraintName: string | null;

    constructor(columns: string | string[]) {
        this.columns = Array.isArray(columns) ? columns : [columns];
        this.referenceColumns = ['id'];
        this.referenceTable = null;
        this.onDeleteAction = null;
        this.onUpdateAction = null;
        this.constraintName = null;
    }

    references(columns: string | string[]): this {
        this.referenceColumns = Array.isArray(columns) ? columns : [columns];
        return this;
    }

    on(table: string): this {
        this.referenceTable = table;
        return this;
    }

    onDelete(action: string): this {
        this.onDeleteAction = action;
        return this;
    }

    onUpdate(action: string): this {
        this.onUpdateAction = action;
        return this;
    }

    cascadeOnDelete(): this {
        return this.onDelete('cascade');
    }
    restrictOnDelete(): this {
        return this.onDelete('restrict');
    }
    nullOnDelete(): this {
        return this.onDelete('set null');
    }
    cascadeOnUpdate(): this {
        return this.onUpdate('cascade');
    }
    name(name: string): this {
        this.constraintName = name;
        return this;
    }
}

/** DDL commands queued on a blueprint (indexes, foreign keys, drops, renames). */
type BlueprintCommand =
    | { type: 'foreign'; fk: ForeignKeyDefinition }
    | { type: 'primary'; columns: string[] }
    | { type: 'unique'; columns: string[] }
    | { type: 'index'; columns: string[] }
    | { type: 'dropColumn'; columns: string[] }
    | { type: 'dropForeign'; columns: string[] }
    | { type: 'dropIndexKind'; kind: string; columns: string[] }
    | { type: 'renameColumn' | 'renameIndex'; from: string; to: string }
    | { type: 'dropPrimary' };

class Blueprint {
    table_: string;
    columns: ColumnDefinition[];
    commands: BlueprintCommand[];
    temporary_: boolean;

    constructor(table: string) {
        this.table_ = table;
        this.columns = [];
        this.commands = [];
        this.temporary_ = false;
    }

    temporary(): this {
        this.temporary_ = true;
        return this;
    }

    addColumn(type: string, name: string, parameters: Record<string, any> = {}): ColumnDefinition {
        const definition = new ColumnDefinition(name, type);
        Object.assign(definition, parameters);
        this.columns.push(definition);
        return definition;
    }

    // -- Column shortcuts ------------------------------------------------------

    id(name: string = 'id'): ColumnDefinition {
        return this.bigIncrements(name);
    }
    bigIncrements(name: string = 'id'): ColumnDefinition {
        const col = this.addColumn('bigInteger', name).autoIncrement().primary();
        return col;
    }
    increments(name: string = 'id'): ColumnDefinition {
        return this.addColumn('integer', name).autoIncrement().primary();
    }
    bigInteger(name: string): ColumnDefinition {
        return this.addColumn('bigInteger', name);
    }
    integer(name: string): ColumnDefinition {
        return this.addColumn('integer', name);
    }
    smallInteger(name: string): ColumnDefinition {
        return this.addColumn('smallInteger', name);
    }
    tinyInteger(name: string): ColumnDefinition {
        return this.addColumn('tinyInteger', name);
    }
    mediumInteger(name: string): ColumnDefinition {
        return this.addColumn('mediumInteger', name);
    }
    float_(name: string, precision: number | null = null): ColumnDefinition {
        return this.addColumn('float', name, { precision });
    }
    double(name: string): ColumnDefinition {
        return this.addColumn('double', name);
    }
    decimal(name: string, total: number = 8, places: number = 2): ColumnDefinition {
        return this.addColumn('decimal', name, { precision: total, places });
    }
    string(name: string, length: number = 255): ColumnDefinition {
        return this.addColumn('string', name, { length_: length });
    }
    char(name: string, length: number = 255): ColumnDefinition {
        return this.addColumn('char', name, { length_: length });
    }
    text(name: string): ColumnDefinition {
        return this.addColumn('text', name);
    }
    mediumText(name: string): ColumnDefinition {
        return this.addColumn('text', name);
    }
    longText(name: string): ColumnDefinition {
        return this.addColumn('text', name);
    }
    tinyText(name: string): ColumnDefinition {
        return this.addColumn('text', name);
    }
    boolean(name: string): ColumnDefinition {
        return this.addColumn('boolean', name);
    }
    date(name: string): ColumnDefinition {
        return this.addColumn('date', name);
    }
    dateTime(name: string, precision: number = 0): ColumnDefinition {
        return this.addColumn('datetime', name, { precision });
    }
    timestamp(name: string, precision: number = 0): ColumnDefinition {
        return this.addColumn('timestamp', name, { precision });
    }
    timestamps(precision: number = 0): void {
        this.timestamp('created_at', precision).nullable();
        this.timestamp('updated_at', precision).nullable();
    }
    timestampsTz(precision: number = 0): void {
        this.timestamps(precision);
    }
    softDeletes(name: string = 'deleted_at', precision: number = 0): ColumnDefinition {
        return this.timestamp(name, precision).nullable();
    }
    json(name: string): ColumnDefinition {
        return this.addColumn('json', name);
    }
    jsonb(name: string): ColumnDefinition {
        return this.addColumn('jsonb', name);
    }
    uuid(name: string = 'uuid'): ColumnDefinition {
        return this.addColumn('uuid', name);
    }
    ulid(name: string = 'ulid'): ColumnDefinition {
        return this.addColumn('char', name, { length_: 26 });
    }
    foreignId(name: string): ColumnDefinition {
        return this.addColumn('bigInteger', name);
    }
    foreignUlid(name: string): ColumnDefinition {
        return this.char(name, 26);
    }
    morphs(name: string): void {
        this.string(`${name}_type`);
        this.foreignId(`${name}_id`).index();
    }
    nullableMorphs(name: string): void {
        this.string(`${name}_type`).nullable();
        this.foreignId(`${name}_id`).nullable().index();
    }
    enum(name: string, values: string[]): ColumnDefinition {
        return this.addColumn('enum', name, { enumValues: values });
    }
    binary(name: string): ColumnDefinition {
        return this.addColumn('binary', name);
    }
    ipAddress(name: string = 'ip_address'): ColumnDefinition {
        return this.string(name, 45);
    }
    macAddress(name: string = 'mac_address'): ColumnDefinition {
        return this.string(name, 17);
    }
    rememberToken(): ColumnDefinition {
        return this.string('remember_token', 100).nullable();
    }
    year(name: string): ColumnDefinition {
        return this.addColumn('integer', name);
    }
    foreign(columns: string | string[]): ForeignKeyDefinition {
        const fk = new ForeignKeyDefinition(columns);
        this.commands.push({ type: 'foreign', fk });
        return fk;
    }

    // -- Index commands -------------------------------------------------------------

    primary(columns: string | string[]): void {
        this.commands.push({ type: 'primary', columns: Arr_wrap(columns) });
    }
    unique(columns: string | string[]): void {
        this.commands.push({ type: 'unique', columns: Arr_wrap(columns) });
    }
    index(columns: string | string[]): void {
        this.commands.push({ type: 'index', columns: Arr_wrap(columns) });
    }
    dropColumn(...names: string[]): void {
        this.commands.push({ type: 'dropColumn', columns: names.flat() });
    }
    dropPrimary(): void {
        this.commands.push({ type: 'dropPrimary' });
    }
    dropUnique(columns: string | string[]): void {
        this.commands.push({ type: 'dropIndexKind', kind: 'unique', columns: Arr_wrap(columns) });
    }
    dropIndex(columns: string | string[]): void {
        this.commands.push({ type: 'dropIndexKind', kind: 'index', columns: Arr_wrap(columns) });
    }
    dropForeign(columns: string | string[]): void {
        this.commands.push({
            type: 'dropForeign',
            columns: Array.isArray(columns)
                ? columns
                : [String(columns).replace(/_foreign$/, '')],
        });
    }
    renameColumn(from: string, to: string): void {
        this.commands.push({ type: 'renameColumn', from, to });
    }
    renameIndex(from: string, to: string): void {
        this.commands.push({ type: 'renameIndex', from, to });
    }
    dropTimestamps(): void {
        this.dropColumn('created_at', 'updated_at');
    }
    dropSoftDeletes(columnName: string = 'deleted_at'): void {
        this.dropColumn(columnName);
    }

    /** Compile the blueprint into SQL statements for the given connection. */
    toSql(connection: CompilerConnection, action: string = 'create'): string[] {
        const statements: string[] = [];
        const compiler = new SqlCompiler(connection);

        if (action === 'create') {
            statements.push(compiler.compileCreate(this));
            for (const command of this.commands) {
                const sql = compiler.compileCommand(this, command);
                if (sql) statements.push(sql);
            }
            for (const column of this.columns) {
                if (column.index_ || (column.unique_ && !column.primary_)) {
                    statements.push(
                        compiler.compileIndex(
                            this.table_,
                            [column.name],
                            column.unique_ ? 'unique' : 'index'
                        )
                    );
                }
            }
        } else {
            for (const column of this.columns) {
                statements.push(compiler.compileAddColumn(this.table_, column));
            }
            for (const command of this.commands) {
                const sql = compiler.compileCommand(this, command);
                if (sql) statements.push(sql);
            }
        }

        return statements.filter(Boolean);
    }
}

function Arr_wrap(value: string | string[]): string[] {
    return Array.isArray(value) ? value : [value];
}

/** Driver-aware SQL generation. */
class SqlCompiler {
    driver: string;

    constructor(connection: CompilerConnection) {
        this.driver = connection.client?.kind || connection.config?.driver || 'sqlite';
    }

    typeFor(column: ColumnDefinition): string {
        switch (column.type) {
            case 'bigInteger':
                return this.driver === 'sqlite'
                    ? column.autoIncrement_
                        ? 'INTEGER'
                        : 'BIGINT'
                    : 'BIGINT';
            case 'integer':
                return this.driver === 'sqlite' ? (column.autoIncrement_ ? 'INTEGER' : 'INTEGER') : 'INT';
            case 'smallInteger':
                return 'SMALLINT';
            case 'tinyInteger':
                return this.driver === 'mysql' ? 'TINYINT' : 'SMALLINT';
            case 'mediumInteger':
                return this.driver === 'mysql' ? 'MEDIUMINT' : 'INTEGER';
            case 'string':
                return this.driver === 'pgsql' ? 'VARCHAR(255)' : `VARCHAR(${column.length_ || 255})`;
            case 'char':
                return `CHAR(${column.length_ || 255})`;
            case 'text':
                return this.driver === 'pgsql' ? 'TEXT' : 'TEXT';
            case 'boolean':
                return this.driver === 'pgsql' ? 'BOOLEAN' : this.driver === 'sqlite' ? 'INTEGER' : 'TINYINT(1)';
            case 'date':
                return 'DATE';
            case 'datetime':
                return this.driver === 'pgsql' ? 'TIMESTAMP(0)' : 'DATETIME';
            case 'timestamp':
                return this.driver === 'pgsql' ? 'TIMESTAMP(0)' : 'TIMESTAMP';
            case 'json':
                return this.driver === 'pgsql' ? 'JSONB' : 'TEXT';
            case 'jsonb':
                return this.driver === 'pgsql' ? 'JSONB' : 'TEXT';
            case 'uuid':
                return this.driver === 'pgsql' ? 'UUID' : 'CHAR(36)';
            case 'enum':
                return this.driver === 'mysql'
                    ? `ENUM(${column.enumValues.map((v) => `'${v}'`).join(', ')})`
                    : 'VARCHAR(255)';
            case 'decimal':
                return `DECIMAL(${column.precision}, ${column.places})`;
            case 'double':
                return 'DOUBLE';
            case 'float':
                return 'FLOAT';
            case 'binary':
                return this.driver === 'pgsql' ? 'BYTEA' : 'BLOB';
            default:
                throw new Error(`Unknown column type: ${column.type}`);
        }
    }

    modifiers(column) {
        let sql = '';
        if (!column.nullable_) sql += ' NOT NULL';
        if (column.defaultValue !== undefined) {
            sql += column.defaultValue?.isExpression
                ? ` DEFAULT ${column.defaultValue.expression}`
                : ` DEFAULT ${this.quoteDefault(column.defaultValue)}`;
        }
        if (this.driver === 'sqlite' && column.autoIncrement_) {
            sql += ' PRIMARY KEY AUTOINCREMENT';
        } else if (this.driver !== 'sqlite' && column.autoIncrement_) {
            sql += ' AUTO_INCREMENT';
            if (this.driver === 'pgsql') sql = sql.replace('AUTO_INCREMENT', '');
        }
        return sql;
    }

    quoteDefault(value: any): string {
        if (typeof value === 'number') return String(value);
        if (typeof value === 'boolean') return this.driver === 'sqlite' ? (value ? '1' : '0') : value ? 'true' : 'false';
        return `'${String(value).replace(/'/g, "''")}'`;
    }

    compileCreate(blueprint: Blueprint): string {
        const parts: string[] = [];
        for (const column of blueprint.columns) {
            let line = `"${column.name}" ${this.typeFor(column)}${this.modifiers(column)}`;
            if (this.driver !== 'sqlite' && column.primary_ && !column.autoIncrement_) {
                line += ' PRIMARY KEY';
            }
            parts.push(line);
        }

        // Non-sqlite auto-increment needs a primary key clause.
        const pkColumns = [
            ...blueprint.columns.filter((c) => c.primary_ && !c.autoIncrement_).map((c) => c.name),
            ...blueprint.commands
                .filter((c) => c.type === 'primary')
                .flatMap((c) => c.columns),
        ];
        if (pkColumns.length > 0 && this.driver !== 'sqlite') {
            parts.push(`PRIMARY KEY (${pkColumns.map((c) => `"${c}"`).join(', ')})`);
        }

        for (const command of blueprint.commands.filter((c) => c.type === 'unique')) {
            parts.push(`UNIQUE (${command.columns.map((c) => `"${c}"`).join(', ')})`);
        }

        for (const command of blueprint.commands.filter((c) => c.type === 'foreign')) {
            parts.push(this.foreignKeySql(command.fk));
        }

        const temporary = blueprint.temporary_ ? 'TEMPORARY ' : '';
        return `CREATE ${temporary}TABLE "${blueprint.table_}" (\n    ${parts.join(',\n    ')}\n)`;
    }

    foreignKeySql(fk: ForeignKeyDefinition): string {
        const constraint =
            fk.constraintName ||
            `${fk.columns.join('_')}_${fk.referenceTable}_${fk.referenceColumns.join('_')}_foreign`.toLowerCase();
        void constraint;
        let sql = `FOREIGN KEY (${fk.columns.map((c) => `"${c}"`).join(', ')}) REFERENCES "${fk.referenceTable}" (${fk.referenceColumns.map((c) => `"${c}"`).join(', ')})`;
        if (fk.onDeleteAction) sql += ` ON DELETE ${fk.onDeleteAction.toUpperCase()}`;
        if (fk.onUpdateAction) sql += ` ON UPDATE ${fk.onUpdateAction.toUpperCase()}`;
        return sql;
    }

    compileAddColumn(table: string, column: ColumnDefinition): string {
        return `ALTER TABLE "${table}" ADD COLUMN "${column.name}" ${this.typeFor(column)}${this.modifiers(column)}`;
    }

    compileCommand(blueprint: Blueprint, command: BlueprintCommand): string {
        switch (command.type) {
            case 'index':
                return this.compileIndex(blueprint.table_, command.columns, 'index');
            case 'unique':
                return this.compileIndex(blueprint.table_, command.columns, 'unique');
            case 'primary':
                if (this.driver === 'sqlite') {
                    return ''; // handled inline during create
                }
                return '';
            case 'foreign':
                return this.driver === 'sqlite'
                    ? '' // inline in create; separate ALTER not supported by sqlite
                    : `ALTER TABLE "${blueprint.table_}" ADD ${this.foreignKeySql(command.fk)}`;
            case 'dropColumn':
                if (this.driver === 'sqlite') {
                    return `ALTER TABLE "${blueprint.table_}" DROP COLUMN "${command.columns[0]}"`;
                }
                return `ALTER TABLE "${blueprint.table_}" DROP COLUMN ${command.columns.map((c) => `"${c}"`).join(', ')}`;
            case 'dropIndexKind': {
                const name = indexName(blueprint.table_, command.columns, command.kind);
                if (this.driver === 'sqlite') return `DROP INDEX IF EXISTS "${name}"`;
                return `ALTER TABLE "${blueprint.table_}" DROP INDEX "${name}"`;
            }
            case 'dropForeign': {
                const cols = command.columns;
                const name = `${blueprint.table_}_${cols.join('_')}_foreign`.toLowerCase();
                if (this.driver === 'sqlite') return '';
                return `ALTER TABLE "${blueprint.table_}" DROP FOREIGN KEY "${name}"`;
            }
            case 'renameColumn':
                return `ALTER TABLE "${blueprint.table_}" RENAME COLUMN "${command.from}" TO "${command.to}"`;
            default:
                return '';
        }
    }

    compileIndex(table: string, columns: string[], kind: string): string {
        const name = indexName(table, columns, kind);
        const unique = kind === 'unique' ? 'UNIQUE ' : '';
        return `CREATE ${unique}INDEX "${name}" ON "${table}" (${columns.map((c) => `"${c}"`).join(', ')})`;
    }
}

function indexName(table: string, columns: string[], kind: string): string {
    return `${table}_${columns.join('_')}_${kind}`.toLowerCase();
}

module.exports = { Blueprint, ColumnDefinition, Expression, ForeignKeyDefinition };
