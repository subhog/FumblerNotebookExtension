"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_LANGUAGE_ID = exports.NOTEBOOK_TYPE = void 0;
exports.languageForCellType = languageForCellType;
exports.cellTypeForLanguage = cellTypeForLanguage;
exports.parseFumblerSource = parseFumblerSource;
exports.serializeFumblerSource = serializeFumblerSource;
exports.NOTEBOOK_TYPE = 'fumbler-notebook';
exports.IMAGE_LANGUAGE_ID = 'fumbler-image';
const DELIMITER = /^\s*# %%(?:\s*(?:\[(\w+)\]|(\w+)))?\s*$/;
function languageForCellType(type) {
    switch (type) {
        case 'markdown':
            return 'markdown';
        case 'image':
            return exports.IMAGE_LANGUAGE_ID;
        default:
            return 'python';
    }
}
function cellTypeForLanguage(language, isMarkup) {
    if (language === exports.IMAGE_LANGUAGE_ID) {
        return 'image';
    }
    if (language === 'markdown' || isMarkup) {
        return 'markdown';
    }
    return 'python';
}
function parseFumblerSource(text) {
    const lines = text.split(/\r?\n/);
    const cells = [];
    let currentType = null;
    let currentLines = [];
    let sawDelimiter = false;
    const flush = () => {
        if (currentType === null && currentLines.every((line) => line === '')) {
            currentLines = [];
            return;
        }
        const type = currentType ?? 'python';
        let bodyLines = trimTrailingEmpty(currentLines);
        if (sawDelimiter) {
            bodyLines = trimLeadingEmpty(bodyLines);
        }
        const value = type === 'markdown' || type === 'image'
            ? uncommentLines(bodyLines).join('\n')
            : bodyLines.join('\n');
        cells.push({ type, value });
        currentLines = [];
    };
    for (const line of lines) {
        const delimiterType = parseDelimiter(line);
        if (delimiterType !== null) {
            flush();
            currentType = delimiterType;
            sawDelimiter = true;
            currentLines = [];
        }
        else {
            currentLines.push(line);
        }
    }
    flush();
    if (cells.length === 0) {
        return [{ type: 'python', value: '' }];
    }
    return cells;
}
function serializeFumblerSource(cells) {
    if (cells.length === 0) {
        return '';
    }
    const parts = cells.map((cell) => {
        const header = cell.type === 'python' ? '# %%' : `# %% [${cell.type}]`;
        const body = cell.type === 'python' ? cell.value : commentLines(cell.value);
        if (body === '') {
            return header;
        }
        return `${header}\n${body}`;
    });
    return `${parts.join('\n\n')}\n`;
}
function parseDelimiter(line) {
    const match = line.match(DELIMITER);
    if (!match) {
        return null;
    }
    const raw = (match[1] || match[2] || 'python').toLowerCase();
    if (raw === 'markdown' || raw === 'md') {
        return 'markdown';
    }
    if (raw === 'image' || raw === 'img') {
        return 'image';
    }
    return 'python';
}
function uncommentLines(lines) {
    return lines.map((line) => {
        if (line.startsWith('# ')) {
            return line.slice(2);
        }
        if (line === '#') {
            return '';
        }
        return line;
    });
}
function commentLines(value) {
    if (value === '') {
        return '';
    }
    return value
        .split('\n')
        .map((line) => (line.length === 0 ? '#' : `# ${line}`))
        .join('\n');
}
function trimTrailingEmpty(lines) {
    const result = [...lines];
    while (result.length > 0 && result[result.length - 1] === '') {
        result.pop();
    }
    return result;
}
function trimLeadingEmpty(lines) {
    const result = [...lines];
    while (result.length > 0 && result[0] === '') {
        result.shift();
    }
    return result;
}
//# sourceMappingURL=format.js.map