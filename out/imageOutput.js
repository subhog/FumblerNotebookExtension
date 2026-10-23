"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageRefFromCellText = imageRefFromCellText;
exports.placeholderImageOutput = placeholderImageOutput;
exports.imageOutputForCell = imageOutputForCell;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const NATIVE_MIME = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
};
const HTML_MIME = {
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
};
function imageRefFromCellText(text) {
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return '';
}
function placeholderImageOutput(cellText) {
    const ref = imageRefFromCellText(cellText);
    if (!ref) {
        return undefined;
    }
    return new vscode.NotebookCellOutput([
        vscode.NotebookCellOutputItem.text(`![](${ref})`, 'text/markdown'),
    ]);
}
async function imageOutputForCell(notebookUri, cellText) {
    const ref = imageRefFromCellText(cellText);
    if (!ref) {
        return textOutput('Image cell is empty. Enter a relative path or URL.');
    }
    try {
        const { data, mime } = await loadImage(notebookUri, ref);
        return outputForImage(data, mime);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return textOutput(message);
    }
}
function textOutput(message) {
    return new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.text(message)]);
}
function outputForImage(data, mime) {
    if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/svg+xml') {
        return new vscode.NotebookCellOutput([new vscode.NotebookCellOutputItem(data, mime)]);
    }
    const base64 = Buffer.from(data).toString('base64');
    const html = `<img src="data:${mime};base64,${base64}" />`;
    return new vscode.NotebookCellOutput([
        vscode.NotebookCellOutputItem.text(html, 'text/html'),
    ]);
}
async function loadImage(notebookUri, ref) {
    if (/^https?:\/\//i.test(ref)) {
        return loadFromUrl(ref);
    }
    const uri = resolveLocalUri(notebookUri, ref);
    try {
        const data = await vscode.workspace.fs.readFile(uri);
        return { data, mime: mimeFromPath(uri.path) };
    }
    catch {
        throw new Error(`Could not read image: ${ref}`);
    }
}
function resolveLocalUri(notebookUri, ref) {
    if (ref.startsWith('file://')) {
        return vscode.Uri.parse(ref);
    }
    if (path.isAbsolute(ref)) {
        return vscode.Uri.file(ref);
    }
    const notebookDir = vscode.Uri.joinPath(notebookUri, '..');
    return vscode.Uri.joinPath(notebookDir, ref);
}
async function loadFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image (${response.status}): ${url}`);
    }
    const data = new Uint8Array(await response.arrayBuffer());
    const headerMime = response.headers.get('content-type')?.split(';')[0]?.trim();
    const mime = headerMime && headerMime.startsWith('image/') ? headerMime : mimeFromPath(url);
    return { data, mime };
}
function mimeFromPath(filePath) {
    const ext = path.extname(filePath.split('?')[0]).toLowerCase();
    return NATIVE_MIME[ext] ?? HTML_MIME[ext] ?? 'image/png';
}
//# sourceMappingURL=imageOutput.js.map