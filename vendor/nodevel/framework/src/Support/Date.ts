'use strict';

/**
 * Date — Nodevel's fluent date/time value object, the equivalent of
 * Laravel's Carbon integration (`Illuminate\Support\Facades\Date`).
 *
 * ponytail: implements the most-used Carbon operations on top of native
 * Date + Intl; swap in Luxon/temporal-polyfill behind this same facade
 * when timezone-heavy work arrives.
 */

export {};

type DateInput = DateWrapper | Date | string | number;

class DateWrapper {
    value: Date;

    constructor(value: any = null) {
        this.value = value === null || value === undefined ? new Date() : new Date(value);
        if (Number.isNaN(this.value.getTime())) {
            throw new TypeError(`Invalid date: ${value}`);
        }
    }

    static now(): DateWrapper { return new DateWrapper(); }
    static parse(value: any): DateWrapper { return new DateWrapper(value); }

    static create(year: number, monthIndex: number = 0, day: number = 1, hours: number = 0, minutes: number = 0, seconds: number = 0): DateWrapper {
        return new DateWrapper(new Date(year, monthIndex, day, hours, minutes, seconds));
    }

    clone(): DateWrapper { return new DateWrapper(new Date(this.value.getTime())); }

    // -- Arithmetic ----------------------------------------------------------------

    add(amount: number, unit: string): DateWrapper { return this.clone().mutate(amount, unit, 1); }
    sub(amount: number, unit: string): DateWrapper { return this.clone().mutate(amount, unit, -1); }

    addDays(n: number): DateWrapper { return this.add(n, 'days'); }
    subDays(n: number): DateWrapper { return this.sub(n, 'days'); }
    addHours(n: number): DateWrapper { return this.add(n, 'hours'); }
    subHours(n: number): DateWrapper { return this.sub(n, 'hours'); }
    addMinutes(n: number): DateWrapper { return this.add(n, 'minutes'); }
    subMinutes(n: number): DateWrapper { return this.sub(n, 'minutes'); }
    addSeconds(n: number): DateWrapper { return this.add(n, 'seconds'); }
    subSeconds(n: number): DateWrapper { return this.sub(n, 'seconds'); }
    addMonths(n: number): DateWrapper { return this.add(n, 'months'); }
    subMonths(n: number): DateWrapper { return this.sub(n, 'months'); }
    addYears(n: number): DateWrapper { return this.add(n, 'years'); }
    subYears(n: number): DateWrapper { return this.sub(n, 'years'); }

    startOfDay(): DateWrapper { return this.withMutations((d) => d.setHours(0, 0, 0, 0)); }
    endOfDay(): DateWrapper { return this.withMutations((d) => d.setHours(23, 59, 59, 999)); }

    // -- Differences ---------------------------------------------------------------

    diffInSeconds(other: DateInput): number {
        return Math.round((this.value.getTime() - toNative(other).getTime()) / 1000);
    }

    diffInMinutes(other: DateInput): number { return Math.round(this.diffInSeconds(other) / 60); }
    diffInHours(other: DateInput): number { return Math.round(this.diffInMinutes(other) / 60); }
    diffInDays(other: DateInput): number { return Math.round(this.diffInHours(other) / 24); }

    // -- Comparisons ---------------------------------------------------------------

    isPast(): boolean { return this.value.getTime() < Date.now(); }
    isFuture(): boolean { return this.value.getTime() > Date.now(); }
    isToday(): boolean { return this.isSameDay(DateWrapper.now()); }
    isWeekend(): boolean { const day = this.value.getDay(); return day === 0 || day === 6; }
    isLeapYear(): boolean {
        const y = this.value.getFullYear();
        return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    }

    eq(other: DateInput): boolean { return this.value.getTime() === toNative(other).getTime(); }
    gt(other: DateInput): boolean { return this.value.getTime() > toNative(other).getTime(); }
    lt(other: DateInput): boolean { return this.value.getTime() < toNative(other).getTime(); }
    gte(other: DateInput): boolean { return !this.lt(other); }
    lte(other: DateInput): boolean { return !this.gt(other); }

    isSameDay(other: DateInput): boolean {
        const o = toNative(other);
        return (
            this.value.getFullYear() === o.getFullYear() &&
            this.value.getMonth() === o.getMonth() &&
            this.value.getDate() === o.getDate()
        );
    }

    min(other: DateInput): DateWrapper { return this.lte(other) ? this.clone() : DateWrapper.parse(toNative(other)); }
    max(other: DateInput): DateWrapper { return this.gte(other) ? this.clone() : DateWrapper.parse(toNative(other)); }

    // -- Getters ---------------------------------------------------------------------

    get year(): number { return this.value.getFullYear(); }
    get month(): number { return this.value.getMonth() + 1; }
    get day(): number { return this.value.getDate(); }
    get hour(): number { return this.value.getHours(); }
    get minute(): number { return this.value.getMinutes(); }
    get second(): number { return this.value.getSeconds(); }
    get timestamp(): number { return Math.floor(this.value.getTime() / 1000); }
    get dayOfWeek(): number { return this.value.getDay(); }
    get daysInMonth(): number {
        return new Date(this.value.getFullYear(), this.value.getMonth() + 1, 0).getDate();
    }

    setYear(y: number): DateWrapper { return this.withMutations((d) => d.setFullYear(y)); }
    setMonth(m: number): DateWrapper { return this.withMutations((d) => d.setMonth(m - 1)); }
    setDay(day: number): DateWrapper { return this.withMutations((d) => d.setDate(day)); }
    setHours(h: number): DateWrapper { return this.withMutations((d) => d.setHours(h)); }
    setMinutes(m: number): DateWrapper { return this.withMutations((d) => d.setMinutes(m)); }

    // -- Output ---------------------------------------------------------------------

    format(template: string): string {
        if (!template || template === 'ISO') return this.toISOString();
        const pad = (n: number) => String(n).padStart(2, '0');
        return template
            .replace(/YYYY/g, String(this.value.getFullYear()))
            .replace(/MM/g, pad(this.month))
            .replace(/DD/g, pad(this.day))
            .replace(/HH/g, pad(this.hour))
            .replace(/mm/g, pad(this.minute))
            .replace(/ss/g, pad(this.second));
    }

    toISOString(): string { return this.value.toISOString(); }
    toDate(): Date { return new Date(this.value.getTime()); }
    toString(): string { return this.toISOString(); }
    toJSON(): string { return this.toISOString(); }
    valueOf(): number { return this.value.getTime(); }
    [Symbol.toPrimitive](hint: string): string | number {
        return hint === 'number' ? this.valueOf() : this.toString();
    }

    // -- Internals -------------------------------------------------------------------

    mutate(amount: number, unit: string, sign: number): this {
        const units: Record<string, number> = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
        if (units[unit]) {
            this.value = new Date(this.value.getTime() + sign * amount * units[unit]);
            return this;
        }
        if (unit === 'months' || unit === 'years') {
            const months = unit === 'years' ? amount * 12 : amount;
            const day = this.value.getDate();
            this.value.setMonth(this.value.getMonth() + sign * months);
            // Clamp overflow (Jan 31 + 1 month -> Feb 28).
            if (this.value.getDate() !== day) this.value.setDate(0);
            return this;
        }
        throw new TypeError(`Unknown date unit "${unit}".`);
    }

    withMutations(fn: (d: Date) => void): DateWrapper {
        const d = this.clone();
        fn(d.value);
        return d;
    }
}

function toNative(other: DateInput): Date {
    return other instanceof DateWrapper ? other.value : new Date(other);
}

module.exports = { default: DateWrapper, Date: DateWrapper, DateWrapper };
