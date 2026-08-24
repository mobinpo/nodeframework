'use strict';

export {};

/**
 * Escape a value for safe HTML output — the equivalent of PHP's
 * `htmlspecialchars` with double encoding enabled, as Blade uses by default.
 */
module.exports = function escapeHtml(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};
