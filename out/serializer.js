"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FumblerNotebookSerializer = void 0;
const vscode = require("vscode");
const format_1 = require("./format");
class FumblerNotebookSerializer {
    async deserializeNotebook(content, _token) {
        const text = new TextDecoder().decode(content);
        const parsed = (0, format_1.parseFumblerSource)(text);
        const cells = parsed.map(toNotebookCell);
        return new vscode.NotebookData(cells);
    }
    async serializeNotebook(data, _token) {
        const cells = data.cells.map((cell) => ({
            type: (0, format_1.cellTypeForLanguage)(cell.languageId, cell.kind === vscode.NotebookCellKind.Markup),
            value: cell.value,
        }));
        return new TextEncoder().encode((0, format_1.serializeFumblerSource)(cells));
    }
}
exports.FumblerNotebookSerializer = FumblerNotebookSerializer;
function toNotebookCell(cell) {
    const language = (0, format_1.languageForCellType)(cell.type);
    const kind = cell.type === 'markdown'
        ? vscode.NotebookCellKind.Markup
        : vscode.NotebookCellKind.Code;
    return new vscode.NotebookCellData(kind, cell.value, language);
}
//# sourceMappingURL=serializer.js.map