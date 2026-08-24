'use strict';

export {};

const { Builder } = require('../DatabaseManager');
const Collection = require('../../Support/Collection');
const Str = require('../../Support/Str');

/**
 * The Eloquent base model — a port of `Illuminate\Database\Eloquent\Model`
 * covering conventions (table names, keys, timestamps), querying, inserts /
 * updates, mass assignment protection, soft deletes, relationships, events,
 * scopes, and serialization.
 */

type Row = Record<string, any>;

/** Static-side extras reachable via `(this.constructor as ModelCtor)` on subclasses. */
interface ModelStaticExtras {
    softDeletes?: boolean;
    dateFormat?: string | null;
    defaultAttributes?: Record<string, any>;
    globalScopes?: ((builder: EloquentBuilder) => void)[];
    eventListeners?: Record<string, ((model: Model) => void)[]>;
    fireStaticEvent?: (eventName: string) => void;
}
type ModelCtor = typeof Model & ModelStaticExtras;

/** Wrapper object returned by `belongsTo()` (augmented for eager loading). */
interface BelongsToWrapper {
    is(other: any): boolean;
    then(onFulfilled?: any, onRejected?: any): any;
    getResults(): Promise<Model | null>;
    setRelation(): void;
    __related?: any;
    __foreignKey?: string;
}

/** Pivot methods dynamically attached by `belongsToMany()`. */
interface PivotHelpers {
    attach(idOrIds: any, pivotAttributes?: Row): Promise<any>;
    detach(idOrIds?: any): Promise<any>;
    sync(ids: any): Promise<{ attached: any[]; detached: any[] }>;
}

/** Laravel-shaped paginator payload. */
interface PaginatorPayload {
    data: any[];
    current_page: number;
    last_page?: number;
    per_page: number;
    total?: number;
    from?: number | null;
    to?: number | null;
    has_more_pages: boolean;
    next_page_url?: number | null;
    prev_page_url?: number | null;
}

class MassAssignmentException extends Error {}

class ModelNotFoundError extends Error {
    declare status: number;

    constructor(model: any) {
        super(`No query results for model [${model}].`);
        this.status = 404;
    }
}

let globalApp: any = null;

/** Bind the application instance used by models (called at boot). */
function setApplication(app: any) {
    globalApp = app;
}

class Model {
    /**
     * Configuration overrides — set these static properties on subclasses:
     *
     *   static table = 'custom_table';
     *   static primaryKey = 'uuid';       // column name
     *   static keyType = 'string';
     *   static incrementing = false;
     *   static timestamps = false;        // manage created_at / updated_at
     *   static dateFormat = 'iso';
     *   static connection = 'mysql';
     *   static fillable = ['name', ...];  // or guarded = [...]
     */
    static table: string | null = null;
    static primaryKey: string = 'id';
    static keyType: string = 'int';
    static incrementing: boolean = true;
    static timestamps: boolean = true;
    static connection: string | null = null;
    static fillable: string[] = [];
    static guarded: string[] = ['*'];
    static with_: string[] = []; // default eager-loaded relations
    static casts: Record<string, string> = {};
    static hiddenFields: string[] = [];
    static visibleFields: string[] = [];
    static appendsList: string[] = [];

    declare lastSavedChanges?: Row;

    attributes: Row;
    original: Row;
    relations: Row;
    exists: boolean;
    wasRecentlyCreated: boolean;
    changesOnSave: Row;

    constructor(attributes: Row = {}) {
        this.attributes = {};
        this.original = {};
        this.relations = {};
        this.exists = false;
        this.wasRecentlyCreated = false;
        this.changesOnSave = {};

        if (!((this.constructor as ModelCtor).timestamps)) {
            /* no-op */
        }

        const defaults = (this.constructor as ModelCtor).defaultAttributes || {};
        for (const [key, value] of Object.entries(defaults)) {
            this.attributes[key] = value;
        }
        this.fill(this.attributesFromConstructor(arguments));

        // Expose attributes as instance properties (the PHP __get
        // equivalent): post.title resolves through attributes.
        const RealClass = new.target || Model;
        return new Proxy(this, {
            get(target, property) {
                // Returning the proxy from the base constructor severs the
                // implicit `instance.constructor` link (it degrades to
                // Object) — restore it so `(this.constructor as ModelCtor).fillable` and
                // friends keep working inside instance methods.
                if (property === 'constructor') return RealClass;
                // Loaded relations win over same-named methods, mirroring
                // PHP where $post->comments is data and $post->comments()
                // re-runs the relationship query.
                if (typeof property === 'string' && property in target.relations) {
                    return target.relations[property];
                }
                if (property in target) return target[property];
                if (typeof property === 'string' && property in target.attributes) {
                    return target.attributeValue(property);
                }
                if (typeof property === 'string' && property in target.relations) {
                    return target.relations[property];
                }
                return undefined;
            },
            set(target, property, value) {
                if (typeof property === 'string' && !(property in target)) {
                    target.attributes[property] = value;
                    return true;
                }
                target[property] = value;
                return true;
            },
            has(target, property) {
                return property in target || property in target.attributes;
            },
        });
    }

    attributesFromConstructor(args: IArguments): Row {
        return args[0] || {};
    }

    // -- Conventions -------------------------------------------------------------

    static getTable(): string {
        return this.table || Str.snake(Str.plural(this.name));
    }

    getTable(): string {
        return (this.constructor as ModelCtor).getTable();
    }

    static getKeyName(): string {
        return this.primaryKey;
    }

    static getConnectionName(): string | null {
        return this.connection;
    }

    /** The database connection resolved from the container. */
    static resolveConnection(): any {
        if (!globalApp) throw new Error('Models require the booted application.');
        return globalApp.make('db').connection(this.getConnectionName());
    }

    connectionInstance(): any {
        return (this.constructor as ModelCtor).resolveConnection();
    }

    // -- Querying -------------------------------------------------------------------

    static newQuery(): EloquentBuilder {
        const builder = new EloquentBuilder(
            this.resolveConnection().table(this.getTable()),
            this
        );
        for (const scope of (this as ModelCtor).globalScopes || []) {
            scope(builder);
        }
        return builder.with_(this.with_);
    }

    static query(): EloquentBuilder {
        return this.newQuery();
    }

    static all(columns?: any[]): Promise<ModelCollection> {
        return this.query().get(columns);
    }

    /** Delete every row of the table — the equivalent of `Model::truncate()`. */
    static async truncate() {
        const connection = this.resolveConnection();
        const table = this.getTable();
        await connection.statement(`DELETE FROM "${table}"`);
        if (this.incrementing && this.keyType === 'int' && connection.client?.kind === 'sqlite') {
            await connection
                .statement(`DELETE FROM sqlite_sequence WHERE name = ?`, [table])
                .catch(() => {});
        }
        return true;
    }

    static find(id: any, columns?: any[]): Promise<Model | null> {
        return this.query().find(id, columns);
    }

    static findOrFail(id: any, columns?: any[]): Promise<Model> {
        return this.query().findOrFail(id, columns);
    }

    static first(columns?: any[]): Promise<Model | null> {
        return this.query().first(columns);
    }

    static firstOrFail(columns?: any[]): Promise<Model> {
        return this.query().firstOrFail(columns);
    }

    static where(...args: any[]): EloquentBuilder {
        return this.query().where(...args);
    }

    /** Static pass-throughs for soft-delete scopes. */
    static withTrashed(): EloquentBuilder {
        return this.query().withTrashed();
    }

    static onlyTrashed(): EloquentBuilder {
        return this.query().onlyTrashed();
    }

    static with(...relations: string[]): EloquentBuilder {
        return this.query().with(...relations);
    }

    // Dynamic `whereEmail('x')` style calls.
    static __callStatic(method: string, args: any[]): any {
        if (method.startsWith('where')) {
            const column = Str.snake(method.slice(5));
            return this.query().where(column, args[0]);
        }
        if (method.startsWith('findBy')) {
            const column = Str.snake(method.slice(6));
            return this.query().where(column, args[0]).first();
        }
        throw new TypeError(`Call to undefined static method ${this.name}::${method}()`);
    }

    // -- Mass assignment -----------------------------------------------------------

    fill(attributes: Row): this {
        for (const [key, value] of Object.entries(attributes)) {
            if (!this.isFillable(key)) {
                if ((this.constructor as ModelCtor).guarded.includes('*')) continue;
                throw new MassAssignmentException(`Add [${key}] to the fillable property of [${(this.constructor as ModelCtor).name}].`);
            }
            this.attributes[key] = value;
        }
        return this;
    }

    isFillable(key: string): boolean {
        const { fillable, guarded } = this.constructor as ModelCtor;
        if (fillable.length > 0 && fillable.includes(key)) return true;
        if (fillable.length === 0 && !guarded.includes('*') && !guarded.includes(key)) return true;
        if (fillable.length === 0 && guarded.includes('*')) return false;
        return false;
    }

    forceFill(attributes: Row): this {
        const savedGuarded = (this.constructor as ModelCtor).guarded;
        try {
            (this.constructor as ModelCtor).guarded = [];
            return this.fill(attributes);
        } finally {
            (this.constructor as ModelCtor).guarded = savedGuarded;
        }
    }

    static create(attributes: Row): Promise<Model> {
        const model = new this({});
        model.fill(attributes);
        return model.save().then(() => model);
    }

    static firstOrCreate(matchAttributes: Row, extra: Row = {}): Promise<any> {
        return this.where(Object.entries(matchAttributes).map(([k, v]) => ({ column: k, value: v }))).first().then(async (existing) => {
            if (existing) return existing;
            return this.create({ ...matchAttributes, ...extra });
        });
    }

    static firstOrNew(matchAttributes: Row, extra: Row = {}): Promise<Model> {
        return this.firstOrCreateLookup(matchAttributes).then((existing) =>
            existing || new this({ ...matchAttributes, ...extra })
        );
    }

    static firstOrCreateLookup(attributes: Row): Promise<Model | null> {
        const query = this.query();
        for (const [k, v] of Object.entries(attributes)) query.where(k, v);
        return query.first();
    }

    static updateOrCreate(matchAttributes: Row, values: Row = {}): Promise<Model> {
        return this.firstOrCreateLookup(matchAttributes).then(async (existing) => {
            if (existing) {
                existing.fill(values);
                await existing.save();
                return existing;
            }
            return this.create({ ...matchAttributes, ...values });
        });
    }

    // -- Persistence -----------------------------------------------------------------

    async save(options: Row = {}): Promise<this> {
        const connection = this.connectionInstance();

        if ((this.constructor as ModelCtor).timestamps) {
            const now = formatTimestamp((this.constructor as ModelCtor).dateFormat);
            if (!this.exists) this.attributes.created_at = this.attributes.created_at || now;
            this.attributes.updated_at = now;
        }

        const keyName = (this.constructor as ModelCtor).getKeyName();

        if (this.exists) {
            const dirty = this.getDirty();
            if (Object.keys(dirty).length === 0) return this;

            await connection
                .table(this.getTable())
                .where(keyName, this.attributes[keyName])
                .update(dirty);

            this.original = { ...this.attributes };
            this.fireModelEvent('updated');
        } else {
            const attributes = { ...this.attributes };
            delete attributes[keyName];
            const idValue = this.attributes[keyName];

            if (idValue !== undefined) {
                attributes[keyName] = idValue;
                await connection.table(this.getTable()).insert(attributes);
            } else {
                const id = await connection.table(this.getTable()).insertGetId(attributes, keyName);
                if ((this.constructor as ModelCtor).incrementing) {
                    this.attributes[keyName] = Number(id);
                }
            }

            this.exists = true;
            this.wasRecentlyCreated = true;
            this.original = { ...this.attributes };
            this.fireModelEvent('created');
        }

        void options;
        return this;
    }

    update(attributes: Row): Promise<this> {
        this.fill(attributes);
        return this.save().then(() => this);
    }

    increment(column: string, amount: number = 1): Promise<this> {
        return this.connectionInstance()
            .table(this.getTable())
            .where((this.constructor as ModelCtor).getKeyName(), this.getKey())
            .increment(column, amount)
            .then(() => {
                this.attributes[column] = Number(this.attributes[column] || 0) + amount;
                return this;
            });
    }

    decrement(column: string, amount: number = 1): Promise<this> {
        return this.connectionInstance()
            .table(this.getTable())
            .where((this.constructor as ModelCtor).getKeyName(), this.getKey())
            .increment(column, -amount)
            .then(() => {
                this.attributes[column] = Number(this.attributes[column] || 0) - amount;
                return this;
            });
    }

    getKey(): any {
        return this.attributes[(this.constructor as ModelCtor).getKeyName()];
    }

    getDirty(): Row {
        const dirty = {};
        for (const [key, value] of Object.entries(this.attributes)) {
            if (!(key in this.original) || JSON.stringify(this.original[key]) !== JSON.stringify(value)) {
                dirty[key] = value;
            }
        }
        return dirty;
    }

    isDirty(key: string | string[] | null = null): boolean {
        const dirty = this.getDirty();
        if (key === null) return Object.keys(dirty).length > 0;
        return Array.isArray(key) ? key.some((k) => k in dirty) : key in dirty;
    }

    isClean(key: string | string[] | null = null): boolean {
        return !this.isDirty(key);
    }

    wasChanged(key: string | string[] | null = null): boolean {
        const changed = this.lastSavedChanges || {};
        if (key === null) return Object.keys(changed).length > 0;
        return Array.isArray(key) ? key.some((k) => k in changed) : key in changed;
    }

    getOriginal(key: string | null = null): any {
        if (key === null) return { ...this.original };
        return key in this.original ? this.original[key] : null;
    }

    refresh(): Promise<this> {
        return (this.constructor as ModelCtor).query().find(this.getKey()).then((fresh) => {
            if (fresh) {
                this.attributes = { ...fresh.attributes };
                this.original = { ...fresh.attributes };
            }
            return this;
        });
    }

    fresh(): Promise<Model | null> {
        return (this.constructor as ModelCtor).query().find(this.getKey());
    }

    // -- Deleting / soft deletes -------------------------------------------------------

    async delete(): Promise<boolean> {
        if (this.softDeletesEnabled()) {
            await this.connectionInstance()
                .table(this.getTable())
                .where((this.constructor as ModelCtor).getKeyName(), this.getKey())
                .update({ deleted_at: formatTimestamp((this.constructor as ModelCtor).dateFormat) });
            this.fireModelEvent('deleted', true);
            return true;
        }
        await this.connectionInstance()
            .table(this.getTable())
            .where((this.constructor as ModelCtor).getKeyName(), this.getKey())
            .delete();
        this.fireModelEvent('deleted', true);
        return true;
    }

    softDeletesEnabled() {
        return Boolean((this.constructor as ModelCtor).softDeletes);
    }

    trashed() {
        return this.softDeletesEnabled() && this.attributes.deleted_at !== null && this.attributes.deleted_at !== undefined;
    }

    restore() {
        return this.connectionInstance()
            .table(this.getTable())
            .where((this.constructor as ModelCtor).getKeyName(), this.getKey())
            .update({ deleted_at: null })
            .then(() => {
                this.attributes.deleted_at = null;
                return this;
            });
    }

    forceDelete() {
        return this.connectionInstance()
            .table(this.getTable())
            .where((this.constructor as ModelCtor).getKeyName(), this.getKey())
            .delete()
            .then(() => true);
    }

    static destroy(...ids: any[]): Promise<any[]> {
        const list = ids.flat(Infinity);
        return Promise.all(
            list.map((id) =>
                this.query().find(id).then((model): any => (model ? model.delete().then(() => model) : 0))
            )
        );
    }

    replicate(except: string[] = []): Model {
        const clone = new (this.constructor as ModelCtor)({});
        clone.exists = false;
        clone.attributes = { ...this.attributes };
        delete clone.attributes[(this.constructor as ModelCtor).getKeyName()];
        if ((this.constructor as ModelCtor).timestamps) {
            delete clone.attributes.created_at;
            delete clone.attributes.updated_at;
        }
        if (this.softDeletesEnabled()) delete clone.attributes.deleted_at;
        for (const key of except) delete clone.attributes[key];
        return clone;
    }

    // -- Relationships --------------------------------------------------------------------

    belongsTo(related: any, foreignKey: string | null = null, ownerKey: string | null = null): BelongsToWrapper {
        const instance = new related({});
        const key = foreignKey || `${Str.snake(related.name)}_${ownerKey || related.primaryKey}`;
        const parentKeyValue = this.attributes[key];

        const relationPromise = parentKeyValue
            ? related.query().where(ownerKey || related.primaryKey, parentKeyValue).first()
            : Promise.resolve(null);

        return {
            is(other) {
                return Boolean(other && other.getKey() === parentKeyValue);
            },
            then(onFulfilled, onRejected) {
                return relationPromise.then(onFulfilled, onRejected);
            },
            getResults: () => relationPromise,
            setRelation: () => {},
        };
    }

    hasOne(related: any, foreignKey: string | null = null, localKey: string | null = null): EloquentBuilder {
        const key = foreignKey || `${Str.snake((this.constructor as ModelCtor).name)}_${localKey || (this.constructor as ModelCtor).primaryKey}`;
        return related.query().where(key, this.getKey());
    }

    hasMany(related: any, foreignKey: string | null = null, localKey: string | null = null): EloquentBuilder {
        const key = foreignKey || `${Str.snake((this.constructor as ModelCtor).name)}_${localKey || (this.constructor as ModelCtor).primaryKey}`;
        return related.query().where(key, this.getKey());
    }

    /**
     * Polymorphic one-to-one — the equivalent of `morphOne()`.
     * Expects `<name>_type` and `<name>_id` columns on the related table.
     */
    morphOne(related: any, name: string, type: string | null = null, id: string | null = null, localKey: string | null = null): EloquentBuilder {
        return this.morphMany(related, name, type, id, localKey).limit(1);
    }

    /** Polymorphic one-to-many — `morphMany()`. */
    morphMany(related: any, name: string, type: string | null = null, id: string | null = null, localKey: string | null = null): EloquentBuilder {
        const typeColumn = type || `${name}_type`;
        const idColumn = id || `${name}_id`;
        return related
            .query()
            .where(typeColumn, (this.constructor as ModelCtor).name)
            .where(idColumn, this.getKey());
    }

    /** Inverse polymorphic relation — `morphTo()`. Awaits the resolved parent model. */
    async morphTo(name: string | null = null, type: string | null = null, id: string | null = null): Promise<Model | null> {
        const fieldName = name || 'commentable';
        const typeColumn = type || `${fieldName}_type`;
        const idColumn = id || `${fieldName}_id`;
        const relatedName = this.attributes[typeColumn];
        if (!relatedName || this.attributes[idColumn] == null) return null;
        const Related = resolveModelClass(relatedName);
        return Related.query()
            .where(Related.primaryKey, this.attributes[idColumn])
            .first();
    }

    /** Nested "has" through an intermediate model — `hasManyThrough()` / `hasOneThrough()`. */
    hasManyThrough(
        related: any,
        through: any,
        firstKey: string | null = null,
        secondKey: string | null = null,
        localKey: string | null = null,
        secondLocalKey: string | null = null
    ): EloquentBuilder {
        const primaryKey = (this.constructor as ModelCtor).primaryKey;
        const firstForeignKey =
            firstKey || `${Str.snake((this.constructor as ModelCtor).name)}_${primaryKey}`;
        const secondForeignKey =
            secondKey || `${Str.snake(through.name)}_${secondLocalKey || primaryKey}`;

        const throughQuery = through.query().select([firstForeignKey]).where(
            firstForeignKey,
            this.getKey()
        );
        return related
            .query()
            .whereIn(secondForeignKey, throughQuery.select([firstForeignKey]));
    }

    /** The has-one flavour of `hasManyThrough`. */
    hasOneThrough(related: any, through: any, firstKey: string | null, secondKey: string | null, localKey: string | null, secondLocalKey: string | null): EloquentBuilder {
        return this.hasManyThrough(
            related,
            through,
            firstKey,
            secondKey,
            localKey,
            secondLocalKey
        ).limit(1);
    }

    belongsToMany(related: any, pivotTable: string | null = null, foreignPivotKey: string | null = null, relatedPivotKey: string | null = null): EloquentBuilder & PivotHelpers {
        const table = pivotTable || [
            Str.snake((this.constructor as ModelCtor).getTable()),
            Str.snake(related.getTable()),
        ]
            .sort()
            .join('_');
        const fk =
            foreignPivotKey ||
            `${Str.snake((this.constructor as ModelCtor).name)}_${(this.constructor as ModelCtor).primaryKey}`;
        const rk = relatedPivotKey || `${Str.snake(related.name)}_${related.primaryKey}`;

        const db = this.connectionInstance();
        const base = db
            .table(table)
            .join(related.getTable(), `${related.getTable()}.${related.primaryKey}`, '=', `${table}.${rk}`)
            .where(`${table}.${fk}`, this.getKey());

        const builder: EloquentBuilder & PivotHelpers = new EloquentBuilder(base, related) as EloquentBuilder & PivotHelpers;

        builder.attach = (idOrIds: any, pivotAttributes: Row = {}) => {
            const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
            return db.table(table).insert(
                ids.map((id) => ({
                    [fk]: this.getKey(),
                    [rk]: id,
                    ...pivotAttributes,
                }))
            );
        };

        builder.detach = (idOrIds: any = null) => {
            const query = db.table(table).where(fk, this.getKey());
            if (idOrIds !== null) query.whereIn(rk, Array.isArray(idOrIds) ? idOrIds : [idOrIds]);
            return query.delete();
        };

        builder.sync = async (ids: any) => {
            const currentRows = await db.table(table).where(fk, this.getKey()).get();
            const current = currentRows.map((r) => r[rk]);
            const target = Array.isArray(ids) ? ids : Object.keys(ids);
            const toAttach = target.filter((id) => !current.includes(Number(id)));
            const toDetach = current.filter((id) => !target.map(Number).includes(Number(id)));
            if (toAttach.length) await builder.attach(toAttach);
            if (toDetach.length) await builder.detach(toDetach);
            return { attached: toAttach, detached: toDetach };
        };

        return builder;
    }

    // Relation accessor caching: `user.posts` resolves via `posts()` once.
    async loadRelation(name: string): Promise<any> {
        if (!(name in this.relations)) {
            const relation = this[name] && typeof this[name] === 'function' ? this[name]() : null;
            if (!relation) throw new Error(`Relationship [${name}] does not exist on [${(this.constructor as ModelCtor).name}].`);
            let result;
            if (typeof relation.getResults === 'function' && !(relation instanceof EloquentBuilder)) {
                result = await relation.getResults();
            } else {
                result = await relation.get();
            }
            this.relations[name] = result instanceof Collection || Array.isArray(result)
                ? result
                : result;
        }
        return this.relations[name];
    }

    // -- Events ---------------------------------------------------------------------------

    fireModelEvent(eventName: string, _isDelete?: boolean): void {
        const handlers = (this.constructor as ModelCtor).eventListeners?.[eventName] || [];
        for (const handler of handlers) handler(this);
    }

    static listen(eventName: string, handler: (model: Model) => void): void {
        (this as ModelCtor).eventListeners = (this as ModelCtor).eventListeners || {};
        (this as ModelCtor).eventListeners![eventName] = [...(((this as ModelCtor).eventListeners![eventName]) || []), handler];
    }

    static observe(observer: Record<string, any>): void {
        for (const eventName of ['retrieved', 'creating', 'created', 'updating', 'updated', 'deleting', 'deleted']) {
            if (typeof observer[eventName] === 'function') {
                this.listen(eventName, (...args) => observer[eventName](...args));
            }
        }
    }

    // -- Serialization ---------------------------------------------------------------------

    castAttribute(key: string, value: any): any {
        const type = (this.constructor as ModelCtor).casts[key];
        if (!type) return value;
        switch (type) {
            case 'boolean':
                return Boolean(value);
            case 'integer':
                return Number(value);
            case 'float':
                return parseFloat(value);
            case 'json':
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            case 'string':
                return String(value);
            default:
                return value;
        }
    }

    attributeValue(key: string): any {
        const raw = this.attributes[key];
        if (raw === undefined && typeof this[`get${Str.pascal(key)}Attribute`] === 'function') {
            return this[`get${Str.pascal(key)}Attribute`](this.attributes);
        }
        return this.castAttribute(key, raw);
    }

    toArray(): Row {
        const output = {};
        for (const key of Object.keys(this.attributes)) {
            output[key] = this.attributeValue(key);
        }
        // Accessor-only attributes.
        for (const method of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
            const match = /^get(\w+)Attribute$/.exec(method);
            if (match && !(Str.snake(match[1]) in output)) {
                output[Str.snake(match[1])] = this[method](this.attributes);
            }
        }
        // Appended attributes.
        for (const key of (this.constructor as ModelCtor).appendsList) {
            const method = `get${Str.pascal(key)}Attribute`;
            if (typeof this[method] === 'function') output[key] = this[method](this.attributes);
        }
        // Loaded relations.
        for (const [relation, value] of Object.entries(this.relations)) {
            if (value === undefined) continue;
            output[relation] = value && typeof value.toArray === 'function'
                ? value.toArray()
                : value && value.toArray
                    ? value.toArray()
                    : value;
        }
        return filterVisible(output, (this.constructor as ModelCtor).hiddenFields, (this.constructor as ModelCtor).visibleFields);
    }

    toJson(pretty: number = 0): string {
        return JSON.stringify(this.toArray(), null, pretty);
    }

    toJSON(): Row {
        return this.toArray();
    }
}

/**
 * The Eloquent query builder — decorates the underlying query builder and
 * hydrates results into models.
 */
class EloquentBuilder {
    base: any;
    modelClass: ModelCtor;
    eagerLoad: string[];
    appliedScopes: { withTrashed: boolean; onlyTrashed: boolean };

    constructor(baseBuilder: any, modelClass: ModelCtor) {
        this.base = baseBuilder;
        this.modelClass = modelClass;
        this.eagerLoad = [];
        this.appliedScopes = { withTrashed: false, onlyTrashed: false };
    }

    cloneWith(newBase: any): EloquentBuilder {
        const b = new EloquentBuilder(newBase, this.modelClass);
        b.eagerLoad = [...this.eagerLoad];
        b.appliedScopes = { ...this.appliedScopes };
        return b;
    }

    proxyToBase(method: string): (...args: any[]) => any {
        return (...args: any[]) => {
            const nextBase = this.base[method](...args);
            return this.cloneWith(nextBase instanceof Builder ? nextBase : this.base);
        };
    }

    with_(relations: any): EloquentBuilder {
        const b = this.cloneWith(this.base);
        b.eagerLoad = [...b.eagerLoad, ...(Array.isArray(relations) ? relations : [relations])];
        return b;
    }

    with(...relations: string[]): EloquentBuilder {
        return this.with_(relations.flat());
    }

    withTrashed(): EloquentBuilder {
        const b = this.cloneWith(this.base);
        b.appliedScopes.withTrashed = true;
        return b;
    }

    onlyTrashed() {
        const b = this.withTrashed();
        b.appliedScopes.onlyTrashed = true;
        return b;
    }

    // Pass-throughs that keep returning Eloquent builders.
    where(...args: any[]): EloquentBuilder {
        const b = this.cloneWith(this.base.where(...args));
        return b;
    }
    orWhere(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.orWhere(...args));
    }
    whereIn(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.whereIn(...args));
    }
    whereNotIn(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.whereNotIn(...args));
    }
    whereNull(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.whereNull(...args));
    }
    whereNotNull(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.whereNotNull(...args));
    }
    whereBetween(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.whereBetween(...args));
    }
    orderBy(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.orderBy(...args));
    }
    orderByDesc(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.orderByDesc(...args));
    }
    latest(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.latest(...args));
    }
    oldest(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.oldest(...args));
    }
    limit(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.limit(...args));
    }
    take(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.take(...args));
    }
    offset(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.offset(...args));
    }
    skip(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.skip(...args));
    }
    select(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.select(...args));
    }
    join(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.join(...args));
    }
    leftJoin(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.leftJoin(...args));
    }
    groupBy(...args: any[]): EloquentBuilder {
        return this.cloneWith(this.base.groupBy(...args));
    }
    distinct(): EloquentBuilder {
        return this.cloneWith(this.base.distinct());
    }

    // Terminal operations.

    applySoftDeleteScope(): this {
        const cls = this.modelClass;
        if (!cls.softDeletes) return this;
        if (this.appliedScopes.onlyTrashed) {
            this.base = this.base.whereNotNull('deleted_at');
        } else if (!this.appliedScopes.withTrashed) {
            this.base = this.base.whereNull('deleted_at');
        }
        return this;
    }

    async get(columns?: any[]): Promise<ModelCollection> {
        this.applySoftDeleteScope();
        const rows = await this.base.get(columns);
        const models = rows.map((row) => this.hydrate(row));

        if (this.eagerLoad.length > 0 && models.length > 0) {
            await this.eagerLoadRelations(models);
        }

        this.modelClass.fireStaticEvent?.('retrieved');
        for (const m of models) m.fireModelEvent('retrieved');

        return new ModelCollection(models, this.modelClass);
    }

    hydrate(row: Row): Model {
        const model = new this.modelClass({});
        model.attributes = { ...row };
        model.original = { ...row };
        model.exists = true;
        return model;
    }

    async eagerLoadRelations(models: Model[]): Promise<void> {
        for (const relation of this.eagerLoad) {
            await eagerLoadRelation(models, relation);
        }
    }

    async first(columns?: any[]): Promise<Model | null> {
        const results = await this.limit(1).get(columns);
        return results.items[0] || null;
    }

    async find(id: any, columns?: any[]): Promise<Model | null> {
        return this.applySoftDeleteScope()
            .cloneWith(this.base.where(this.modelClass.primaryKey, id))
            .first(columns);
    }

    async findOrFail(id: any, columns?: any[]): Promise<Model> {
        const found = await this.find(id, columns);
        if (!found) throw new ModelNotFoundError(this.modelClass.name);
        return found;
    }

    async firstOrFail(columns?: any[]): Promise<Model> {
        const found = await this.first(columns);
        if (!found) throw new ModelNotFoundError(this.modelClass.name);
        return found;
    }

    async count(column: string = '*'): Promise<number> {
        this.applySoftDeleteScope();
        return this.base.count(column);
    }

    /**
     * Paginate models — mirrors `paginate()` on Laravel's Eloquent builder.
     * Returns the paginator payload with `data` hydrated into models.
     */
    async paginate(perPage: number = 15, page: number | string = 1): Promise<PaginatorPayload> {
        this.applySoftDeleteScope();
        const result = await this.base.paginate(perPage, page);
        // Keep `data` a plain array so the paginator payload stays JSON-ready;
        // models hydrate lazily via items when callers need them.
        result.data = result.data.map((row) => this.hydrate(row));
        return result;
    }

    /** Paginate models without a total count. */
    async simplePaginate(perPage: number = 15, page: number | string = 1): Promise<PaginatorPayload> {
        this.applySoftDeleteScope();
        const result = await this.base.simplePaginate(perPage, page);
        result.data = result.data.map((row) => this.hydrate(row));
        return result;
    }

    async max(...a: any[]): Promise<any> {
        return this.base.max(...a);
    }
    async min(...a: any[]): Promise<any> {
        return this.base.min(...a);
    }
    async sum(...a: any[]): Promise<any> {
        return this.base.sum(...a);
    }
    async avg(...a: any[]): Promise<any> {
        return this.base.avg(...a);
    }
    async exists(): Promise<boolean> {
        this.applySoftDeleteScope();
        return this.base.exists();
    }
    async doesntExist(): Promise<boolean> {
        return !(await this.exists());
    }
    async value(column: string): Promise<any> {
        const row = await this.select(column).first();
        return row ? row.attributes[column] : null;
    }
    async pluck(column: string): Promise<any[]> {
        const rows = await this.get([column]);
        return rows.items.map((m) => m.attributes[column]);
    }

    /** Create and persist a new model. */
    async create(attributes: Row): Promise<Model> {
        const model = new this.modelClass({});
        model.fill(attributes);
        await model.save();
        return model;
    }

    make(attributes: Row): Model {
        const model = new this.modelClass({});
        model.fill(attributes);
        return model;
    }

    /** Mass update across matching models — does not dispatch events. */
    async update(values: Row): Promise<number> {
        this.applySoftDeleteScope();
        return this.base.update(values);
    }

    /** Mass delete across matching models — does not dispatch events. */
    async delete(): Promise<number> {
        const cls = this.modelClass;
        if (cls.softDeletes && !this.appliedScopes.withTrashed && !this.appliedScopes.onlyTrashed) {
            this.applySoftDeleteScope();
            return this.base.update({ deleted_at: formatTimestamp(cls.dateFormat) });
        }
        this.applySoftDeleteScope();
        return this.base.delete();
    }

    async chunkById(count: number, callback: (models: ModelCollection) => any, column: string = 'id'): Promise<boolean> {
        let lastId = 0;
        for (;;) {
            const rows = await this.cloneWith(this.base.where(column, '>', lastId))
                .cloneWith(this.base.orderBy(column))
                .limit(count)
                .get();
            if (rows.count() === 0) return true;
            lastId = Number(rows.items[rows.items.length - 1].attributes[column]);
            if ((await callback(rows)) === false) return false;
            if (rows.count() < count) return true;
        }
    }

    async each(callback: (model: Model) => any, count: number = 1000): Promise<boolean> {
        return this.chunkById(count, async (models: any) => {
            for (const model of models) if ((await callback(model)) === false) return false;
            return true;
        });
    }

    // Aggregates pass-through.
    async insertGetId(...a: any[]): Promise<any> {
        return this.base.insertGetId(...a);
    }
}

/** A collection of models. */
class ModelCollection extends Collection {
    declare items: Model[];
    declare modelClassRef: ModelCtor;

    constructor(models: Model[], modelClass: ModelCtor) {
        super(models);
        this.modelClassRef = modelClass;
    }

    toArray(): any[] {
        return this.items.map((model) => model.toArray());
    }

    toJson(pretty: number = 0): string {
        return JSON.stringify(this.toArray(), null, pretty);
    }

    modelKeys(): any[] {
        return this.items.map((m) => m.getKey());
    }

    find(key: any): Model | null {
        return this.items.find((m) => String(m.getKey()) === String(key)) || null;
    }
}

/** Load one named relationship across a set of models in a single query. */
async function eagerLoadRelation(models: Model[], relation: string): Promise<void> {
    const first = models[0];
    if (typeof first[relation] !== 'function') {
        throw new Error(`Relationship [${relation}] does not exist on [${first.constructor.name}].`);
    }

    // Determine relation shape by inspecting a probe call.
    const relatedClass = relationMeta(first, relation);

    if (relatedClass.kind === 'belongsTo') {
        const keys = [...new Set(models.map((m) => m.attributes[relatedClass.foreignKey]))].filter(Boolean);
        const parents = await relatedClass.related.query().whereIn(relatedClass.ownerKey, keys).get();
        const map = new Map(parents.items.map((p) => [String(p.attributes[relatedClass.ownerKey]), p]));
        for (const model of models) {
            model.relations[relation] = map.get(String(model.attributes[relatedClass.foreignKey])) || null;
        }
        return;
    }

    if (relatedClass.kind === 'hasMany' || relatedClass.kind === 'hasOne') {
        const keys = models.map((m) => m.getKey());
        const children = await relatedClass.related
            .query()
            .whereIn(relatedClass.foreignKey, keys)
            .get();
        const grouped = new Map();
        for (const child of children.items) {
            const key = String(child.attributes[relatedClass.foreignKey]);
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(child);
        }
        for (const model of models) {
            const group = grouped.get(String(model.getKey())) || [];
            model.relations[relation] =
                relatedClass.kind === 'hasOne' ? group[0] || null : new ModelCollection(group, relatedClass.related);
        }
        return;
    }

    // Fallback: lazy-load per model (correct, less efficient).
    for (const model of models) {
        await model.loadRelation(relation);
    }
}

/** Shape depends on the relation kind (belongsTo carries an ownerKey). */
type RelationMeta =
    | { kind: 'belongsTo'; related: ModelCtor; foreignKey: string; ownerKey: string }
    | { kind: 'hasMany' | 'hasOne'; related: ModelCtor; foreignKey: string };

function relationMeta(model: Model, relation: string): RelationMeta {
    const probe = Object.create(model);
    // defineProperty (not assignment) so the write stays on the probe —
    // a plain assignment would hit the model proxy's set-trap and wipe
    // the real model's attributes.
    Object.defineProperty(probe, 'attributes', { value: {}, writable: true, configurable: true });
    const relationResult = model[relation].call(probe);
    const source = model[relation].toString();

    let related;
    if (relationResult && relationResult.modelClass) related = relationResult.modelClass;
    else if (relationResult && relationResult.__related) related = relationResult.__related;
    else throw new Error(`Cannot determine related model for relation [${relation}].`);

    if (source.includes('.belongsTo(')) {
        return {
            kind: 'belongsTo',
            related,
            foreignKey: relationResult.__foreignKey,
            ownerKey: related.primaryKey,
        };
    }
    if (source.includes('.hasMany(')) {
        return { kind: 'hasMany', related, foreignKey: guessForeignKey(source, model) };
    }
    return { kind: 'hasOne', related, foreignKey: guessForeignKey(source, model) };
}

function guessForeignKey(source: string, model: Model): string {
    const match = /['"]([\w]+)_?id['"]/.exec(source.replace(/\s/g, ''));
    return (
        match?.[1] ||
        `${Str.snake(model.constructor.name)}_${(model.constructor as ModelCtor).primaryKey}`
    );
}

// Attach `__related` markers onto belongsTo wrappers so eager loading can
// discover the related class.
const originalBelongsTo = Model.prototype.belongsTo;
Model.prototype.belongsTo = function patchedBelongsTo(related: any, ...rest: any[]): BelongsToWrapper {
    const wrapper = originalBelongsTo.call(this, related, ...rest);
    wrapper.__related = related;
    const metaForeignKey =
        rest[0] || `${Str.snake(related.name)}_${related.primaryKey}`;
    wrapper.__foreignKey = metaForeignKey;
    return wrapper;
};

function formatTimestamp(format: any): number | string {
    const date = new Date();
    if (format === 'U') return Math.floor(date.getTime() / 1000);
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Resolve a model class from its morph map name — either an already-registered
 * alias or a class in `app/Models`.
 */
function resolveModelClass(name: string): any {
    const map = (globalThis as any).__nodevel_morph_map || {};
    if (typeof map[name] === 'function') return map[name];
    const appPath = globalApp ? globalApp.appPath('Models', `${name}`) : null;
    if (!appPath) throw new Error(`Cannot resolve morphTo target [${name}].`);
    const loaded = require(appPath);
    return loaded.default || loaded[name] || loaded;
}

/** Register the polymorphic type map — the equivalent of `Relation::morphMap()`. */
function enforceMorphMap(map: Record<string, ModelCtor>): void {
    (globalThis as any).__nodevel_morph_map = { ...map };
}

function filterVisible(object: Row, hidden: string[], visible: string[]): Row {
    if (visible.length > 0) {
        const filtered = {};
        for (const key of visible) if (key in object) filtered[key] = object[key];
        return filtered;
    }
    const filtered = { ...object };
    for (const key of hidden) delete filtered[key];
    return filtered;
}

module.exports = {
    Model,
    EloquentBuilder,
    ModelCollection,
    MassAssignmentException,
    ModelNotFoundError,
    setApplication,
    enforceMorphMap,
};
