'use strict';

const crypto = require('crypto');

/**
 * String utilities — a focused port of `Illuminate\Support\Str`.
 */

export {};

class Str {
    static camel(value: string): string {
        return Str.lcfirst(Str.pascal(value));
    }

    static snake(value: string, delimiter: string = '_'): string {
        if (!/[A-Z]/.test(value)) return value.toLowerCase();
        const result = value
            .replace(/(.)([A-Z][a-z]+)/g, `$1${delimiter}$2`)
            .replace(/([a-z\d])([A-Z])/g, `$1${delimiter}$2`)
            .toLowerCase();
        return result;
    }

    static snakeWords(value: any): string {
        // Split separators AND camelCase boundaries so `UserStatus` -> "user status"-like words.
        return String(value)
            .replace(/[-_.]+/g, ' ')
            .replace(/([a-z\d])([A-Z])/g, '$1 $2');
    }

    static kebab(value: string): string {
        return Str.snake(value, '-');
    }

    static pascal(value: any): string {
        return Str.words(Str.snakeWords(value))
            .map((word) => Str.ucfirst(word))
            .join('');
    }

    static ucfirst(string: string): string {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    static lcfirst(string: string): string {
        return string.charAt(0).toLowerCase() + string.slice(1);
    }

    /** Split into whitespace separated words. */
    static words(value: any): string[] {
        return String(value)
            .trim()
            .split(/\s+/)
            .filter(Boolean);
    }

    /** Pluralize a simple English word using a rule table. */
    static plural(value: string, count: number = 2): string {
        if (count === 1) return value;
        const irregulars: Record<string, string> = {
            child: 'children',
            person: 'people',
            man: 'men',
            woman: 'women',
            mouse: 'mice',
            foot: 'feet',
            tooth: 'teeth',
            goose: 'geese',
            ox: 'oxen',
        };
        const lower = value.toLowerCase();
        if (irregulars[lower]) {
            return (value.charAt(0) as any).isUpper
                ? Str.ucfirst(irregulars[lower])
                : irregulars[lower];
        }
        const uncountable = [
            'audio', 'equipment', 'deer', 'fish', 'information', 'money',
            'rice', 'series', 'sheep', 'species', 'police', 'news',
        ];
        if (uncountable.includes(lower)) return value;
        if (/(quiz)$/i.test(value)) return value.replace(/quiz$/i, 'quizzes');
        if (/([sxz]|[cs]h)$/i.test(value)) return value + 'es';
        if (/[^aeiou]y$/i.test(value)) return value.replace(/y$/i, 'ies') || value;
        if (/f$/i.test(value)) return value.replace(/f$/i, 'ves');
        if (/fe$/i.test(value)) return value.replace(/fe$/i, 'ves');
        return value + 's';
    }

    /** Singularize a simple English word. */
    static singular(value: string): string {
        const irregulars: Record<string, string> = {
            children: 'child',
            people: 'person',
            men: 'man',
            women: 'woman',
            mice: 'mouse',
            feet: 'foot',
            teeth: 'tooth',
            geese: 'goose',
            oxen: 'ox',
        };
        const lower = value.toLowerCase();
        if (irregulars[lower]) return irregulars[lower];
        if (/(quizzes)$/i.test(value)) return value.replace(/quizzes$/i, 'quiz');
        if (/(ives)$/i.test(value)) return value.replace(/ives$/i, 'ife');
        if (/([sxz]es|[cs]hes)$/i.test(value)) return value.replace(/es$/i, '');
        if (/([^aeiou])ies$/i.test(value)) return value.replace(/ies$/i, 'y');
        if (/(ves)$/i.test(value)) return value.replace(/ves$/i, 'f');
        if (/([^s])s$/i.test(value)) return value.replace(/s$/i, '');
        return value;
    }

    static studly(value: any): string {
        return Str.pascal(value);
    }

    static title(value: string): string {
        return Str.words(value)
            .map((word) => Str.ucfirst(word.toLowerCase()))
            .join(' ');
    }

    static slug(title: any, separator: string = '-'): string {
        return String(title)
            .normalize('NFKD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, separator)
            .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '');
    }

    static startsWith(haystack: string, needles: string | string[]): boolean {
        for (const needle of ArrWrap(needles)) {
            if (needle !== '' && haystack.startsWith(needle)) return true;
        }
        return false;
    }

    static endsWith(haystack: string, needles: string | string[]): boolean {
        for (const needle of ArrWrap(needles)) {
            if (needle !== '' && haystack.endsWith(needle)) return true;
        }
        return false;
    }

    static contains(haystack: string, needles: string | string[]): boolean {
        for (const needle of ArrWrap(needles)) {
            if (needle !== '' && haystack.includes(needle)) return true;
        }
        return false;
    }

    static before(subject: string, search: string): string {
        const idx = subject.indexOf(search);
        return idx === -1 ? subject : subject.slice(0, idx);
    }

    static after(subject: string, search: string): string {
        const idx = subject.indexOf(search);
        return idx === -1 ? subject : subject.slice(idx + search.length);
    }

    static limit(value: string, limit: number = 100, end: string = '...'): string {
        if (value.length <= limit) return value;
        return value.slice(0, limit).trimEnd() + end;
    }

    static random(length: number = 16): string {
        const chars =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let out = '';
        for (let i = 0; i < length; i++) {
            out += chars[Math.floor(Math.random() * chars.length)];
        }
        return out;
    }

    static uuid(): string {
        return crypto.randomUUID();
    }

    /** Generate a time-ordered UUID (version 7). */
    static uuid7(time: number = Date.now()): string {
        let hexTime = time.toString(16).padStart(12, '0');
        while (hexTime.length < 12) hexTime = '0' + hexTime;

        const bytes = new Uint8Array(16);
        for (let i = 0; i < 6; i++) {
            bytes[i] = parseInt(hexTime.substr(i * 2, 2), 16);
        }
        for (let i = 6; i < 16; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }

        // Set version 7 and variant bits.
        bytes[6] = (bytes[6] & 0x0f) | 0x70;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const h = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
        return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }

    static ulid(time: number = Date.now()): string {
        const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
        let timePart = '';
        let t = time;
        for (let i = 0; i < 10; i++) {
            timePart = ENCODING[t % 32] + timePart;
            t = Math.floor(t / 32);
        }
        let randomness = '';
        for (let i = 0; i < 16; i++) {
            randomness += ENCODING[Math.floor(Math.random() * 32)];
        }
        return timePart + randomness;
    }
}

function ArrWrap(value: string | string[]): string[] {
    return Array.isArray(value) ? value : [value];
}

module.exports = Str;
