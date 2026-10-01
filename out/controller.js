"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FumblerNotebookController = void 0;
const vscode = require("vscode");
const format_1 = require("./format");
const imageOutput_1 = require("./imageOutput");
class FumblerNotebookController {
    constructor() {
        this.executionOrder = 0;
        this.controller = vscode.notebooks.createNotebookController('fumbler-notebook-controller', format_1.NOTEBOOK_TYPE, 'Fumbler Notebook');
        this.controller.supportedLanguages = ['python', format_1.IMAGE_LANGUAGE_ID];
        this.controller.supportsExecutionOrder = true;
        this.controller.executeHandler = (cells) => {
            void this.executeCells(cells);
        };
        this.controller.onDidChangeSelectedNotebooks((event) => {
            if (event.selected) {
                void this.renderImageCells(event.notebook);
            }
        });
    }
    dispose() {
        this.controller.dispose();
    }
    async renderImageCells(notebook) {
        const imageCells = notebook
            .getCells()
            .filter((cell) => cell.document.languageId === format_1.IMAGE_LANGUAGE_ID);
        await this.executeCells(imageCells);
    }
    async renderImageCell(cell) {
        await this.executeCells([cell]);
    }
    async executeCells(cells) {
        for (const cell of cells) {
            await this.executeCell(cell);
        }
    }
    async executeCell(cell) {
        let execution;
        try {
            execution = this.controller.createNotebookCellExecution(cell);
        }
        catch {
            return;
        }
        execution.executionOrder = ++this.executionOrder;
        execution.start(Date.now());
        try {
            if (cell.document.languageId === format_1.IMAGE_LANGUAGE_ID) {
                const output = await (0, imageOutput_1.imageOutputForCell)(cell.notebook.uri, cell.document.getText());
                execution.replaceOutput([output]);
            }
            else {
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.text('Python execution is not implemented in this scaffold.'),
                    ]),
                ]);
            }
            execution.end(true, Date.now());
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            execution.replaceOutput([
                new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.error(err)]),
            ]);
            execution.end(false, Date.now());
        }
    }
}
exports.FumblerNotebookController = FumblerNotebookController;
//# sourceMappingURL=controller.js.map