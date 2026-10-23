"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpolate = interpolate;
const PLACEHOLDER = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
function interpolate(template, values) {
    return template.replace(PLACEHOLDER, (match, name) => {
        if (!Object.prototype.hasOwnProperty.call(values, name)) {
            return match;
        }
        return formatValue(values[name]);
    });
}
function formatValue(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (value === null) {
        return 'null';
    }
    return JSON.stringify(value);
}
//# sourceMappingURL=interpolate.js.map