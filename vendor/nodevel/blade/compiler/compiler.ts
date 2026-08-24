'use strict';

export {};

/**
 * The Blade compiler.
 *
 * Compiles Blade template strings into executable JavaScript. Expressions
 * written in templates use familiar PHP-flavoured syntax which is translated
 * to JavaScript at compile time:
 *
 *   - `$variable` references become plain identifiers resolved through the
 *     render scope (a `with` block over the view's data).
 *   - The object operator `->` and the static operator `::` both become `.`.
 */

const registry = require('./registry');

const CONDITIONALS: Array<[string, string]> = [
    ['auth', '(guardCheck(%s))'],
    ['guest', '(!guardCheck(%s))'],
    ['production', "(app().environment() === 'production')"],
    ['env', 'app().environment(...ensureArray(%s))'],
];

/** Options accepted by the Compiler constructor. */
interface CompilerOptions {
    /** Nested compilation keeps sentinel characters for the outermost pass. */
    nested?: boolean;
    /** Full render options are forwarded when compiling during render. */
    [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Expression translation
// ---------------------------------------------------------------------------

/**
 * Translate a PHP-flavoured expression into JavaScript.
 *
 * String contents are preserved; only identifier tokens outside of strings
 * are rewritten.
 */
function translateExpression(expression: string): string {
    let out = '';
    let i = 0;
    const len = expression.length;

    while (i < len) {
        const ch = expression[i];

        // Preserve string literals verbatim.
        if (ch === "'" || ch === '"' || ch === '`') {
            const quote = ch;
            out += ch;
            i++;
            while (i < len) {
                if (expression[i] === '\\') {
                    out += expression.slice(i, i + 2);
                    i += 2;
                    continue;
                }
                out += expression[i];
                if (expression[i] === quote) {
                    i++;
                    break;
                }
                i++;
            }
            continue;
        }

        // `$variable` -> `variable`
        if (ch === '$' && /[A-Za-z_]/.test(expression[i + 1] || '')) {
            let j = i + 1;
            while (j < len && /\w/.test(expression[j])) j++;
            out += expression.slice(i + 1, j);
            i = j;
            continue;
        }

        // `->` and `::` -> `.`
        if (ch === '-' && expression[i + 1] === '>') {
            out += '.';
            i += 2;
            continue;
        }
        if (ch === ':' && expression[i + 1] === ':') {
            out += '.';
            i += 2;
            continue;
        }

        // Concatenation operator: `.` used between expression contexts -> `+`.
        // A dot attached to a digit (e.g. `1.5`) stays untouched.
        if (
            ch === '.' &&
            !/\d/.test(expression[i - 1] || '') &&
            /[\w'"$]/.test(expression[i + 1] || '')
        ) {
            out += '+';
            i++;
            continue;
        }

        out += ch;
        i++;
    }

    return out;
}

/** Translate every argument of a comma separated expression list. */
function translateArguments(raw: string): string[] {
    return splitTopLevel(raw).map((part) => translateExpression(part.trim()));
}

/** Split a string on top-level commas (not inside strings or brackets). */
function splitTopLevel(raw: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    let i = 0;

    while (i < raw.length) {
        const ch = raw[i];
        if (ch === "'" || ch === '"' || ch === '`') {
            const quote = ch;
            current += ch;
            i++;
            while (i < raw.length) {
                if (raw[i] === '\\') {
                    current += raw.slice(i, i + 2);
                    i += 2;
                    continue;
                }
                current += raw[i];
                if (raw[i] === quote) {
                    i++;
                    break;
                }
                i++;
            }
            continue;
        }
        if ('([{'.includes(ch)) depth++;
        if (')]}'.includes(ch)) depth--;
        if (ch === ',' && depth === 0) {
            parts.push(current);
            current = '';
            i++;
            continue;
        }
        current += ch;
        i++;
    }
    if (current.trim() !== '' || parts.length > 0) parts.push(current);

    return parts;
}

function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function kebabToCamel(name: string): string {
    return name.replace(/-(\w)/g, (_: string, c: string) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Directive compilation
// ---------------------------------------------------------------------------

class Compiler {
    options: CompilerOptions;
    switchDepth: number;
    uid: number;
    /** Ids of currently open @switch blocks (lazily created by @switch). */
    switchIds!: number[];
    /** Number of emitted case blocks for the innermost @switch. */
    caseBlocks!: number;

    constructor(options: CompilerOptions = {}) {
        this.options = options;
        this.switchDepth = 0;
        this.uid = 0;
    }

    nextId(): number {
        return this.uid++;
    }

    /** Compile a template string into a JavaScript async function body. */
    compileString(template: string): string {
        let code = template;

        // 1. Strip Blade comments.
        code = code.replace(/\{\{--[\s\S]*?--\}\}/g, '');

        // 2. Protect verbatim regions.
        const verbatims: string[] = [];
        code = code.replace(/@verbatim([\s\S]*?)@endverbatim/g, (_m: string, inner: string) => {
            verbatims.push(inner);
            return ` V${verbatims.length - 1} `;
        });

        // 3. Escape literal `@{{` and `@@`.
        code = code.replace(/@\{\{/g, ' E ');
        code = code.replace(/@@/g, ' A ');

        // 4. Compile @php blocks.
        code = this.compilePhpBlocks(code);

        // 5. Compile @forelse blocks structurally (they need restructuring).
        code = this.compileForelse(code);

        // 6. Compile component tags (recursive).
        code = this.compileComponents(code);

        // 7. Compile directives.
        code = this.compileDirectives(code);

        // 8. Compile echoes. Emissions are sentinel-delimited so the final
        // literal-wrap pass knows they are generated code.
        code = code
            .replace(
                /\{\!\!(.+?)\!\!\}/gs,
                (_m: string, expr: string) =>
                    `\u0001__output((${translateExpression(expr.trim())}), { raw: true });\u0002`
            )
            .replace(/\{\{([\s\S]+?)\}\}/g, (_m: string, expr: string) =>
                expr.includes('\n')
                    ? `\u0001__output((async()=>${translateExpression(expr.trim())})());\u0002`
                    : `\u0001__output((${translateExpression(expr.trim())}));\u0002`
            );

        // 9. Restore escapes and verbatim.
        code = code.replace(/ E /g, '{{').replace(/ A /g, '@');
        code = code.replace(/ V(\d+) /g, (_m: string, idx: string) => verbatims[Number(idx)]);

        // Wrap remaining literal text into output statements so the body is
        // valid JavaScript (bare text between directives would otherwise be
        // parsed as identifiers).
        return this.wrapLiteralText(code);
    }

    /**
     * Split compiled code into statements vs literal-text chunks. Depth-
     * aware: semicolons inside parentheses belong to their statement (e.g.
     * C-style for loops). Any non-empty top-level gap between statements is
     * literal template text and gets wrapped in an output call.
     */
    wrapLiteralText(code: string): string {
        let result = '';
        let buffer = '';

        const flush = (): void => {
            if (buffer.trim()) {
                // Literal template chunks are trusted markup (only echo
                // statements interpolate dynamic values), so emit raw.
                result += `__output(${JSON.stringify(buffer)}, { raw: true });`;
            } else {
                result += buffer;
            }
            buffer = '';
        };

        let i = 0;
        while (i < code.length) {
            const ch = code[i];

            if (ch === '\u0001') {
                flush();
                i++;
                while (i < code.length && code[i] !== '\u0002') {
                    result += code[i];
                    i++;
                }
                i++;
                continue;
            }

            buffer += ch;
            i++;
        }
        flush();

        // Nested compilation keeps sentinels for the outermost pass.
        if (this.options.nested) return result;
        return result.replace(/[\u0001\u0002]/g, '');
    }

    // -- @php -----------------------------------------------------------------

    compilePhpBlocks(code: string): string {
        let result = '';
        let cursor = 0;

        for (;;) {
            const startIdx = code.indexOf('@php', cursor);
            if (startIdx === -1) {
                result += code.slice(cursor);
                break;
            }

            const after = code.slice(startIdx + 4);
            if (/^\s*\(/.test(after)) {
                // Inline statement form: @php($counter = 1)
                const parenStart = startIdx + 4 + (/^\s*/.exec(after) as RegExpExecArray)[0].length;
                const closeIdx = matchParen(code, parenStart);
                if (closeIdx !== -1) {
                    const inner = code.slice(parenStart + 1, closeIdx);
                    result += code.slice(cursor, startIdx);
                    result += `{ ${translateExpression(inner)}; }`;
                    cursor = closeIdx + 1;
                    continue;
                }
            }

            // Block form: find matching @endphp (no nesting support needed).
            const endIdx = code.indexOf('@endphp', startIdx);
            if (endIdx === -1) {
                result += code.slice(cursor);
                break;
            }
            result += code.slice(cursor, startIdx);
            result += translateExpression(code.slice(startIdx + 4, endIdx));
            cursor = endIdx + '@endphp'.length;
        }

        return result;
    }

    // -- @forelse --------------------------------------------------------------

    /**
     * Restructure @forelse blocks. Because the @empty branch appears after the
     * main body, a plain directive-for-directive translation cannot express
     * it; we match the full block and emit structured JavaScript.
     */
    compileForelse(code: string): string {
        let result = '';
        let cursor = 0;

        const openRe = /@forelse\s*\(([\s\S]*?)\)\s*/y;
        for (;;) {
            openRe.lastIndex = cursor;
            const m = openRe.exec(code);
            if (!m) {
                result += code.slice(cursor);
                break;
            }

            const bodyStart = cursor + m[0].length;
            const { mainBody, emptyBody, blockEnd } = this.splitForelseBlock(code, bodyStart);

            const [subjectRaw, rest] = splitArrow(m[1]);
            const subject = translateExpression(subjectRaw.trim());
            const mm = /^\s*\$\s*(\w+)\s*(?:\s*=>\s*\$\s*(\w+))?\s*$/.exec(rest || '');
            if (!mm) throw new Error(`Malformed @forelse arguments: ${m[1]}`);

            const id = this.nextId();
            const inner = new Compiler({ ...this.options, nested: true }).compileString(mainBody);
            const emptyCompiled = emptyBody !== null ? this.compileString(emptyBody) : '';

            result += code.slice(cursor, m.index);

            result += `\u0001{ const __e${id} = __entries(${subject});` +
                ` if (!__e${id}.length) { ${emptyCompiled}` +
                ` } else { for (let __i${id} = 0; __i${id} < __e${id}.length; __i${id}++) {` +
                ` const ${mm[1]} = __e${id}[__i${id}][1];` +
                (mm[2] ? ` const ${mm[2]} = __e${id}[__i${id}][0];` : '') +
                ` const loop = __loop(__i${id}, __e${id}.length);` +
                ` ${inner} } } }\u0002`;

            cursor = blockEnd;
        }

        return result;
    }

    /** Find the @empty / @endforelse boundaries of a @forelse block. */
    splitForelseBlock(code: string, bodyStart: number): { mainBody: string; emptyBody: string | null; blockEnd: number } {
        let depth = 1;
        let searchFrom = bodyStart;
        let emptyAt = -1;

        for (;;) {
            const nextOpen = indexOfDirective(code, 'forelse', searchFrom);
            const nextEmpty = indexOfDirective(code, 'empty', searchFrom);
            const nextEnd = indexOfDirective(code, 'endforelse', searchFrom);

            if (nextEnd === -1) throw new Error('@forelse without matching @endforelse');

            const candidates = [
                nextOpen !== -1 && nextOpen < nextEnd ? { at: nextOpen, kind: 'open' } : null,
                nextEmpty !== -1 && nextEmpty < nextEnd && (emptyAt === -1 || nextEmpty < emptyAt)
                    ? { at: nextEmpty, kind: 'empty' }
                    : null,
            ].filter(Boolean) as Array<{ at: number; kind: 'open' | 'empty' }>;

            const first = candidates.sort((a, b) => a.at - b.at)[0];

            if (!first || first.at > nextEnd) {
                const mainBody = emptyAt === -1 ? code.slice(bodyStart, nextEnd) : code.slice(bodyStart, emptyAt);
                const emptyBody = emptyAt === -1 ? null : code.slice(emptyAt + '@empty'.length, nextEnd);
                return { mainBody, emptyBody, blockEnd: nextEnd + '@endforelse'.length };
            }

            if (first.kind === 'open') {
                // Nested forelse: skip past its matching end.
                const inner = this.splitForelseBlock(code, code.indexOf('\n', first.at) + 1);
                depth--;
                void depth;
                searchFrom = inner.blockEnd;
                continue;
            }

            emptyAt = first.at;
            searchFrom = first.at + '@empty'.length;
        }
    }

    // -- Components --------------------------------------------------------------

    compileComponents(template: string): string {
        let result = '';
        let cursor = 0;

        for (;;) {
            const remaining = template.slice(cursor);
            const match = COMPONENT_TAG.exec(remaining);
            if (!match) {
                result += remaining;
                break;
            }

            const [, rawName, attrText, selfClosing] = match;
            const tagStart = cursor + match.index;

            result += template.slice(cursor, tagStart);

            const componentName = kebabToCamel(rawName).replace(/[.:]/g, '.');

            const attrSource = this.buildAttributes(attrText);

            if (selfClosing === '/') {
                result += `\u0001await __component(${JSON.stringify(componentName)}, ${attrSource}, '', {});\u0002`;
                cursor = tagStart + match[0].length;
                continue;
            }

            const { inner, blockEnd } = this.findComponentBody(
                template,
                tagStart + match[0].length,
                rawName
            );
            cursor = blockEnd;

            // Split named slots from default content.
            const slots: Record<string, { source: string; attributes: Record<string, unknown> }> = {};
            let defaultContent = inner;
            const slotRe = /<x-slot(?:[:\s])([a-zA-Z0-9_-]*)((?:\s+[^\s=>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*?)\s*(\/?)>([\s\S]*?)<\/\s*x-slot:\s*\1\s*>/g;
            defaultContent = inner.replace(slotRe, (_all: string, slotName: string, slotAttrs: string, _sc: string, content: string) => {
                const parsed = parseAttributes(slotAttrs || '');
                const meta: Record<string, unknown> = {};
                for (const a of parsed) {
                    meta[a.name] = a.kind === 'expr' ? { expr: a.value } : a.value;
                }
                slots[kebabToCamel(slotName)] = {
                    source: this.compileString(content),
                    attributes: meta,
                };
                return '';
            });

            const slotEntries = Object.entries(slots)
                .map(
                    ([name, s]) =>
                        `${JSON.stringify(name)}: { content: await __captureOutput(async () => { ${s.source} }), attributes: ${JSON.stringify(s.attributes)} }`
                )
                .join(',');

            result +=
                `\u0001await __component(${JSON.stringify(componentName)}, ${attrSource},` +
                ` await __captureOutput(async () => { ${this.compileString(defaultContent)} }),` +
                ` {${slotEntries}});\u0002`;
        }

        return result;
    }

    buildAttributes(attrText: string): string {
        const attrs = parseAttributes(attrText || '');
        const parts: string[] = [];
        for (const attr of attrs) {
            const key = JSON.stringify(kebabToCamel(attr.name));
            if (attr.kind === 'expr') {
                parts.push(`${key}: (${translateExpression(attr.value)})`);
            } else {
                parts.push(`${key}: ${JSON.stringify(attr.value)}`);
            }
        }
        return `{${parts.join(',')}}`;
    }

    findComponentBody(template: string, bodyStart: number, rawName: string): { inner: string; blockEnd: number } {
        const openRe = new RegExp(`<x-${escapeRegExp(rawName)}(?:\\s[^>]*?)?>`, 'g');
        const closeRe = new RegExp(`</\\s*x-${escapeRegExp(rawName)}\\s*>`, 'g');

        const marks: Array<{ index: number; type: 'open' | 'close' }> = [];
        let m: RegExpExecArray | null;
        openRe.lastIndex = bodyStart;
        while ((m = openRe.exec(template))) {
            if (m[0].endsWith('/>')) continue;
            marks.push({ index: m.index, type: 'open' });
        }
        closeRe.lastIndex = bodyStart;
        while ((m = closeRe.exec(template))) marks.push({ index: m.index, type: 'close' });
        marks.sort((a, b) => a.index - b.index);

        let depth = 1;
        for (const mark of marks) {
            if (mark.type === 'open') {
                depth++;
                continue;
            }
            depth--;
            if (depth === 0) {
                const endGt = template.indexOf('>', mark.index);
                return { inner: template.slice(bodyStart, mark.index), blockEnd: endGt + 1 };
            }
        }

        throw new Error(`Unclosed component tag <x-${rawName}>`);
    }

    // -- Directives ---------------------------------------------------------------

    compileDirectives(code: string): string {
        const names = Object.keys(DIRECTIVES).sort((a, b) => b.length - a.length);
        const customNames: string[] = [...registry.customIfs.keys()].filter(
            (n: string) => !DIRECTIVES[n] && !CONDITIONALS.some(([c]) => c === n)
        );
        const all = [...names, ...customNames.map((n) => n)].join('|');
        const directiveRe = new RegExp(`@(\\w+)\\b(\\s*\\(([\\s\\S]*?)\\))?`, 'g');

        return code.replace(directiveRe, (match: string, name: string, _ws: string | undefined, rawArgs: string | undefined) => {
            const lower = name.toLowerCase();

            // Custom conditionals registered via `Blade::if`.
            if (customNames.includes(lower)) {
                const args = rawArgs !== undefined ? translateArguments(rawArgs).join(',') : '';
                return `\x01if (custom_${lower}(${args})) {\x02`;
            }

            const handler = DIRECTIVES[lower];
            if (handler) return `\x01${handler.call(this, rawArgs as string)}\x02`;

            // Built-in conditional directives.
            const cond = CONDITIONALS.find(([n]) => n === lower);
            if (cond) {
                const args = rawArgs !== undefined ? translateExpression(rawArgs.trim()) : '';
                const test = cond[1].replace('%s', args);
                return `if (${test}) {`;
            }

            return match; // unknown directive: leave untouched
        });
    }
}

/** A directive table entry: called with the raw argument string on the Compiler. */
interface DirectiveHandler {
    (this: Compiler, rawArgs: string): string;
}

// ---------------------------------------------------------------------------
// Directive table
// ---------------------------------------------------------------------------

const DIRECTIVES: Record<string, DirectiveHandler> = {
    // Conditionals -------------------------------------------------------------
    if(a) { return `if (${t(a)}) {`; },
    elseif(a) { return `} else if (${t(a)}) {`; },
    else() { return '} else {'; },
    endif() { return '}'; },
    unless(a) { return `if (!(${t(a)})) {`; },
    endunless() { return '}'; },
    isset(a) { return `if (__isset(${t(a)})) {`; },
    endisset() { return '}'; },
    empty_(a) { return `if (__empty(${t(a)})) {`; },
    endempty() { return '}'; },
    unset() { return ''; },

    // Loops ----------------------------------------------------------------------
    for(a) {
        const parts = splitTopLevelSemicolons(t(a));
        return `for (${parts.join(';')}) {`;
    },
    endfor() { return '}'; },

    foreach(a) {
        const [subjectRaw, rest] = splitArrow(a);
        const subject = t(subjectRaw.trim());
        const m = /^\s*\$\s*(\w+)\s*(?:\s*=>\s*\$\s*(\w+))?\s*$/.exec(rest || '');
        if (!m) throw new Error(`Malformed @foreach arguments: ${a}`);
        const id = this.nextId();
        return (
            `{ const __e${id} = __entries(${subject});` +
            ` for (let __i${id} = 0; __i${id} < __e${id}.length; __i${id}++) {` +
            ` const ${m[1]} = __e${id}[__i${id}][1];` +
            (m[2] ? ` const ${m[2]} = __e${id}[__i${id}][0];` : '') +
            ` const loop = __loop(__i${id}, __e${id}.length);`
        );
    },
    endforeach() { return '} }'; },
    while(a) { return `while (${t(a)}) {`; },
    endwhile() { return '}'; },

    continue(a) {
        return a && a.trim() ? `if (${t(a)}) continue;` : 'continue;';
    },
    break(a) {
        const inSwitch = this.switchDepth > 0 && this.switchIds && this.switchIds.length > 0;
        if (inSwitch) {
            const id = this.switchIds[this.switchIds.length - 1];
            return a && a.trim()
                ? `if (${t(a)}) done${id} = true;`
                : `done${id} = true;`;
        }
        if (!a || !a.trim()) return 'break;';
        return `if (${t(a)}) break;`;
    },

    // Switch ------------------------------------------------------------------------
    switch(a) {
        this.switchDepth++;
        const id = this.nextId();
        this.switchIds = this.switchIds || [];
        this.switchIds.push(id);
        this.caseBlocks = 0;
        return `{ let matched${id} = false; let done${id} = false; let any${id} = false; let val${id} = (${t(a)});`;
    },
    case(a) {
        const id = this.switchIds[this.switchIds.length - 1];
        const close = `}`.repeat(this.caseBlocks);
        this.caseBlocks = 1;
        return close +
            `if (!done${id} && !any${id} && __looseEquals(val${id}, (${t(a)}))) { matched${id} = true; any${id} = true; }` +
            `if (matched${id} && !done${id}) {`;
    },
    default() {
        const id = this.switchIds[this.switchIds.length - 1];
        const close = `}`.repeat(this.caseBlocks);
        this.caseBlocks = 1;
        return close +
            `if (!done${id} && !any${id}) { matched${id} = true; }` +
            `if (matched${id} && !done${id} && !any${id}) {`;
    },
    endswitch() {
        this.switchDepth--;
        this.switchIds.pop();
        const close = `}`.repeat(this.caseBlocks) + `}`;
        return close;
    },

    // Includes ------------------------------------------------------------------------
    include(a) {
        const p = ta(a);
        return `await __include(${p[0]}, ${p[1] || 'undefined'});`;
    },
    includeIf(a) {
        const p = ta(a);
        return `if (await __exists(${p[0]})) await __include(${p[0]}, ${p[1] || 'undefined'});`;
    },
    includeWhen(a) {
        const p = ta(a);
        return `if (${p[0]}) await __include(${p[1]}, ${p[2] || 'undefined'});`;
    },
    includeUnless(a) {
        const p = ta(a);
        return `if (!(${p[0]})) await __include(${p[1]}, ${p[2] || 'undefined'});`;
    },
    includefirst(a) {
        const p = ta(a);
        return `await __includeFirst(${p[0]}, ${p[1] || 'undefined'});`;
    },
    includeisolated(a) {
        const p = ta(a);
        return `await __includeIsolated(${p[0]}, ${p[1] || '{}'});`;
    },
    each(a) {
        const p = ta(a);
        return `await __each(${p[0]}, ${p[1]}, ${p[2] ? t(p[2]) : "'item'"}, ${p[3] || 'null'});`;
    },

    // Stacks -----------------------------------------------------------------------------
    push(a) { return `__stackOpen(${t(a)}, 'push'); {`; },
    prepend(a) { return `__stackOpen(${t(a)}, 'prepend'); {`; },
    endpush() { return '} __stackClose();'; },
    endprepend() { return '} __stackClose();'; },
    pushif(a) {
        const p = ta(a);
        return `if (${p[0]}) { __stackOpen(${p[1]}, 'push'); {`;
    },
    endpushif() { return '} __stackClose(); }'; },
    hasstack(a) { return `if (__hasStack(${t(a)})) {`; },
    endhasstack() { return '}'; },
    pushonce(a) {
        const p = ta(a);
        return `__stackOpen(${p[0]}, 'push'); if (__onceBegin(${p[1] || p[0]})) {`;
    },
    endpushonce() { return '} __stackClose();'; },
    prependonce(a) {
        const p = ta(a);
        return `__stackOpen(${p[0]}, 'prepend'); if (__onceBegin(${p[1] || p[0]})) {`;
    },
    endprependonce() { return '} __stackClose();'; },
    once() { return `if (__onceBegin('__once:' + __viewName())) {`; },
    endonce() { return '}'; },

    // Sections / layouts --------------------------------------------------------------------
    extends(a) { return `__extendsView(${t(a)});`; },
    section(a) {
        const parts = splitTopLevel(a);
        if (parts.length >= 2) {
            return `__sectionInline(${t(parts[0].trim())}, ${t(parts.slice(1).join(','))});`;
        }
        return `__sectionStart(${t(a)}); {`;
    },
    endsection() { return '} __sectionStore();'; },
    show() { return '} __sectionShow();'; },
    stop() { return '} __sectionStore();'; },
    overwrite() { return '} __sectionOverwrite(); __sectionStore();'; },
    yield(a) {
        const p = ta(a);
        return `__output(__yieldSection(${p[0]}, ${p[1] || 'undefined'}), { raw: true });`;
    },
    parent() { return `__output('@parent');`; },
    hassection(a) { return `if (__hasSection(${t(a)})) {`; },
    endhassection() { return '}'; },
    sectionmissing(a) { return `if (!__hasSection(${t(a)})) {`; },
    endsectionmissing() { return '}'; },

    // Raw imports / injection ------------------------------------------------------------------
    use(a) {
        const m = /^\s*(['"`])(.+?)\1/.exec(a || '');
        return m ? `await __useImport(${JSON.stringify(m[2])});` : '';
    },
    inject(a) {
        const p = ta(a);
        return `var ${p[0]} = app().make(${p[1]});`;
    },

    // Forms ---------------------------------------------------------------------------------------
    csrf() {
        return `__output('<input type="hidden" name="_token" value="' + esc(csrfToken()) + '">');`;
    },
    method(a) {
        return `__output('<input type="hidden" name="_method" value="' + esc(String(${t(a)})) + '">');`;
    },
    error(a) {
        const p = ta(a);
        const bag = p[1] || "'default'";
        return (
            `if (typeof errors().firstOf === 'function' && errors().anyOf(${bag}) && errors().firstOf(${bag}, ${p[0]}) !== undefined)` +
            ` { var message = errors().firstOf(${bag}, ${p[0]});`
        );
    },
    enderror() { return '}'; },

    // Conditional attributes -----------------------------------------------------------------------------------------
    class(a) { return `__output(conditionalClass(${t(a)}));`; },
    style(a) { return `__output(conditionalStyle(${t(a)}));`; },
    checked(a) { return `__output(truthyAttr('checked', ${t(a)}));`; },
    selected(a) { return `__output(truthyAttr('selected', ${t(a)}));`; },
    disabled(a) { return `__output(truthyAttr('disabled', ${t(a)}));`; },
    readonly(a) { return `__output(truthyAttr('readonly', ${t(a)}));`; },
    required(a) { return `__output(truthyAttr('required', ${t(a)}));`; },

    // Fragments ----------------------------------------------------------------------------------------------------------
    fragment(a) { return `__fragmentStart(${t(a)}); {`; },
    endfragment() { return '} __fragmentStop();'; },
};

// Shorthands used inside the table above.
const t = (expr: unknown): string => translateExpression(expr == null ? '' : String(expr));
const ta = (raw: unknown): string[] => translateArguments(raw == null ? '' : String(raw));

const COMPONENT_TAG =
    /<x-([a-zA-Z0-9_.:-]+)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*?)\s*(\/?)>/;

/** One parsed attribute: `name`, `:name` (expr) or `::name` (static) with its value. */
interface ParsedAttribute {
    name: string;
    kind: 'expr' | 'static';
    value: string;
}

/** Parse attribute text into { name, kind, value } entries. */
function parseAttributes(text: string): ParsedAttribute[] {
    const attrs: ParsedAttribute[] = [];
    const re = /(::)?(:)?([a-zA-Z0-9_:\-.]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>/]+)))?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
        const [, doubleColon, colonPrefix, name, , dq, sq, bare]: (string | undefined)[] = m;
        const value = dq !== undefined ? dq : sq !== undefined ? sq : bare;
        if (colonPrefix) {
            attrs.push({
                name: name as string,
                kind: 'expr',
                value: value === undefined ? '' : value,
            });
        } else if (doubleColon) {
            attrs.push({
                name: (name as string).replace(/^:/, ''),
                kind: 'static',
                value: value === undefined ? '' : value,
            });
        } else {
            attrs.push({ name: name as string, kind: 'static', value: value === undefined ? '' : value });
        }
    }
    return attrs;
}

function matchParen(str: string, parenIndex: number): number {
    let depth = 0;
    for (let i = parenIndex; i < str.length; i++) {
        const ch = str[i];
        if (ch === '(') depth++;
        else if (ch === ')') {
            depth--;
            if (depth === 0) return i;
        } else if ("'\"`".includes(ch)) {
            const quote = ch;
            i++;
            while (i < str.length && str[i] !== quote) {
                if (str[i] === '\\') i++;
                i++;
            }
        }
    }
    return -1;
}

function splitTopLevelSemicolons(raw: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if ("'\"`".includes(ch)) {
            const quote = ch;
            current += ch;
            i++;
            while (i < raw.length) {
                if (raw[i] === '\\') {
                    current += raw.slice(i, i + 2);
                    i += 2;
                    continue;
                }
                current += raw[i];
                if (raw[i] === quote) {
                    i++;
                    break;
                }
            }
            continue;
        }
        if ('([{'.includes(ch)) depth++;
        if (')]}'.includes(ch)) depth--;
        if (ch === ';' && depth === 0) {
            parts.push(current.trim());
            current = '';
            continue;
        }
        current += ch;
    }
    if (current.trim() !== '') parts.push(current.trim());
    return parts;
}

function splitArrow(raw: string): [string, string] {
    const asIdx = raw.search(/\s+as\s+\$/);
    if (asIdx === -1) return [raw, ''];
    return [raw.slice(0, asIdx), raw.slice(asIdx + 4)];
}

/** Find the byte offset of `@<name>` as a standalone directive. */
function indexOfDirective(haystack: string, name: string, from = 0): number {
    const needle = '@' + name;
    let idx = from;
    for (;;) {
        idx = haystack.indexOf(needle, idx);
        if (idx === -1) return -1;
        const before = haystack[idx - 1];
        const after = haystack[idx + needle.length];
        const boundaryBefore = before === undefined || !/[A-Za-z0-9_$@]/.test(before);
        const boundaryAfter = after === undefined || !/[A-Za-z0-9_]/.test(after);
        if (boundaryBefore && boundaryAfter) return idx;
        idx += needle.length;
    }
}

module.exports = { Compiler, translateExpression };
