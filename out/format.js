"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PYTHON_LANGUAGE_ID = exports.SVG_LANGUAGE_ID = exports.FREECAD_LANGUAGE_ID = exports.IMAGE_LANGUAGE_ID = exports.NOTEBOOK_TYPE = void 0;
exports.languageForCellType = languageForCellType;
exports.cellTypeForLanguage = cellTypeForLanguage;
exports.parseFumblerSource = parseFumblerSource;
exports.serializeFumblerSource = serializeFumblerSource;
exports.NOTEBOOK_TYPE = 'fumbler-notebook';
exports.IMAGE_LANGUAGE_ID = 'fumbler-image';
exports.FREECAD_LANGUAGE_ID = 'fumbler-freecad';
exports.SVG_LANGUAGE_ID = 'fumbler-svg';
exports.PYTHON_LANGUAGE_ID = 'python';
const DELIMITER = /^\s*# %%(?:\s*(?:\[(\w+)\]|(\w+)))?\s*$/;
function languageForCellType(type) {
    switch (type) {
        case 'markdown':
            return 'markdown';
        case 'image':
            return exports.IMAGE_LANGUAGE_ID;
        case 'svg':
            return exports.SVG_LANGUAGE_ID;
        case 'python':
            return exports.PYTHON_LANGUAGE_ID;
        default:
            return exports.FREECAD_LANGUAGE_ID;
    }
}
function cellTypeForLanguage(language, isMarkup) {
    if (language === exports.IMAGE_LANGUAGE_ID) {
        return 'image';
    }
    if (language === exports.SVG_LANGUAGE_ID) {
        return 'svg';
    }
    if (language === exports.PYTHON_LANGUAGE_ID) {
        return 'python';
    }
    if (language === exports.FREECAD_LANGUAGE_ID) {
        return 'freecad';
    }
    if (language === 'markdown' || isMarkup) {
        return 'markdown';
    }
    return 'freecad';
}
function isCommentedCell(type) {
    return type === 'markdown' || type === 'image' || type === 'svg';
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
        const type = currentType ?? 'freecad';
        let bodyLines = trimTrailingEmpty(currentLines);
        if (sawDelimiter) {
            bodyLines = trimLeadingEmpty(bodyLines);
        }
        const value = isCommentedCell(type)
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
        return [{ type: 'freecad', value: '' }];
    }
    return cells;
}
function serializeFumblerSource(cells) {
    if (cells.length === 0) {
        return '';
    }
    const parts = cells.map((cell) => {
        const header = cell.type === 'freecad' ? '# %%' : `# %% [${cell.type}]`;
        const body = isCommentedCell(cell.type) ? commentLines(cell.value) : cell.value;
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
    const raw = (match[1] || match[2] || 'freecad').toLowerCase();
    if (raw === 'python' || raw === 'py') {
        return 'python';
    }
    if (raw === 'markdown' || raw === 'md') {
        return 'markdown';
    }
    if (raw === 'image' || raw === 'img') {
        return 'image';
    }
    if (raw === 'svg') {
        return 'svg';
    }
    return 'freecad';
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