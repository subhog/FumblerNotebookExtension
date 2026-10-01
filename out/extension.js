"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const controller_1 = require("./controller");
const format_1 = require("./format");
const serializer_1 = require("./serializer");
function activate(context) {
    const controller = new controller_1.FumblerNotebookController();
    context.subscriptions.push(controller, vscode.workspace.registerNotebookSerializer(format_1.NOTEBOOK_TYPE, new serializer_1.FumblerNotebookSerializer(), {
        transientOutputs: true,
    }), vscode.workspace.onDidOpenNotebookDocument((notebook) => {
        if (notebook.notebookType === format_1.NOTEBOOK_TYPE) {
            void controller.renderImageCells(notebook);
        }
    }), vscode.workspace.onDidChangeNotebookDocument((event) => {
        if (event.notebook.notebookType !== format_1.NOTEBOOK_TYPE) {
            return;
        }
        for (const change of event.cellChanges) {
            if (!change.document) {
                continue;
            }
            if (change.cell.document.languageId === format_1.IMAGE_LANGUAGE_ID) {
                void controller.renderImageCell(change.cell);
            }
        }
        for (const contentChange of event.contentChanges) {
            for (const cell of contentChange.addedCells) {
                if (cell.document.languageId === format_1.IMAGE_LANGUAGE_ID) {
                    void controller.renderImageCell(cell);
                }
            }
        }
    }), vscode.commands.registerCommand('fumbler-notebook.insertImageCell', async () => {
        const editor = vscode.window.activeNotebookEditor;
        if (!editor || editor.notebook.notebookType !== format_1.NOTEBOOK_TYPE) {
            vscode.window.showErrorMessage('Open a Fumbler notebook to insert an Image cell.');
            return;
        }
        const cell = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, 'assets/sample.svg', format_1.IMAGE_LANGUAGE_ID);
        const index = editor.selections[0]?.end ?? editor.notebook.cellCount;
        const edit = new vscode.WorkspaceEdit();
        edit.set(editor.notebook.uri, [vscode.NotebookEdit.insertCells(index, [cell])]);
        await vscode.workspace.applyEdit(edit);
    }));
    for (const notebook of vscode.workspace.notebookDocuments) {
        if (notebook.notebookType === format_1.NOTEBOOK_TYPE) {
            void controller.renderImageCells(notebook);
        }
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map