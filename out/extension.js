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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const controller_1 = require("./controller");
const format_1 = require("./format");
const imageOutput_1 = require("./imageOutput");
const serializer_1 = require("./serializer");
function activate(context) {
    const controller = new controller_1.FumblerNotebookController();
    context.subscriptions.push(controller, vscode.workspace.registerNotebookSerializer(format_1.NOTEBOOK_TYPE, new serializer_1.FumblerNotebookSerializer(), {
        transientOutputs: true,
    }), vscode.workspace.onDidOpenNotebookDocument((notebook) => {
        if (notebook.notebookType === format_1.NOTEBOOK_TYPE) {
            void controller.renderNotebook(notebook);
        }
    }), vscode.workspace.onDidChangeNotebookDocument((event) => {
        if (event.notebook.notebookType !== format_1.NOTEBOOK_TYPE) {
            return;
        }
        for (const change of event.cellChanges) {
            if (!change.document) {
                continue;
            }
            const languageId = change.cell.document.languageId;
            if (languageId === format_1.IMAGE_LANGUAGE_ID) {
                void controller.renderImageCell(change.cell);
            }
            else if (languageId === format_1.PYTHON_LANGUAGE_ID || languageId === format_1.SVG_LANGUAGE_ID) {
                controller.scheduleRefresh(event.notebook);
            }
        }
        for (const contentChange of event.contentChanges) {
            for (const cell of contentChange.addedCells) {
                if (cell.document.languageId === format_1.IMAGE_LANGUAGE_ID) {
                    void controller.renderImageCell(cell);
                }
            }
            const structural = [...contentChange.addedCells, ...contentChange.removedCells];
            if (structural.some((cell) => cell.document.languageId === format_1.PYTHON_LANGUAGE_ID ||
                cell.document.languageId === format_1.SVG_LANGUAGE_ID)) {
                controller.scheduleRefresh(event.notebook);
            }
        }
    }), vscode.commands.registerCommand('fumbler-notebook.insertImageCell', () => insertCell(new vscode.NotebookCellData(vscode.NotebookCellKind.Code, 'assets/sample.svg', format_1.IMAGE_LANGUAGE_ID), 'Image')), vscode.commands.registerCommand('fumbler-notebook.insertPythonCell', () => insertCell(new vscode.NotebookCellData(vscode.NotebookCellKind.Code, 'import math\nwidth = 320\nheight = 120\n', format_1.PYTHON_LANGUAGE_ID), 'Python')), vscode.commands.registerCommand('fumbler-notebook.insertFreecadCell', () => insertCell(new vscode.NotebookCellData(vscode.NotebookCellKind.Code, 'import FreeCAD\n', format_1.FREECAD_LANGUAGE_ID), 'FreeCAD')), vscode.commands.registerCommand('fumbler-notebook.insertSvgCell', () => insertCell(new vscode.NotebookCellData(vscode.NotebookCellKind.Code, '<svg xmlns="http://www.w3.org/2000/svg" width="{{width}}" height="{{height}}">\n</svg>\n', format_1.SVG_LANGUAGE_ID), 'SVG')));
    for (const notebook of vscode.workspace.notebookDocuments) {
        if (notebook.notebookType === format_1.NOTEBOOK_TYPE) {
            void controller.renderNotebook(notebook);
        }
    }
}
async function insertCell(cell, label) {
    const editor = vscode.window.activeNotebookEditor;
    if (!editor || editor.notebook.notebookType !== format_1.NOTEBOOK_TYPE) {
        vscode.window.showErrorMessage(`Open a Fumbler notebook to insert a ${label} cell.`);
        return;
    }
    if (cell.languageId === format_1.IMAGE_LANGUAGE_ID) {
        const placeholder = (0, imageOutput_1.placeholderImageOutput)(cell.value);
        if (placeholder) {
            cell.outputs = [placeholder];
        }
    }
    const index = editor.selections[0]?.end ?? editor.notebook.cellCount;
    const edit = new vscode.WorkspaceEdit();
    edit.set(editor.notebook.uri, [vscode.NotebookEdit.insertCells(index, [cell])]);
    await vscode.workspace.applyEdit(edit);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map