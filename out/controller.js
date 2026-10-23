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
exports.FumblerNotebookController = void 0;
const vscode = __importStar(require("vscode"));
const format_1 = require("./format");
const imageOutput_1 = require("./imageOutput");
const interpolate_1 = require("./interpolate");
const pythonDefs_1 = require("./pythonDefs");
/** Language no cell uses. Empty supportedLanguages means "all languages" and would show Run. */
const UNRUNNABLE_LANGUAGE = 'fumbler-unrunnable';
const REFRESH_DELAY_MS = 300;
class FumblerNotebookController {
    constructor() {
        this.generations = new Map();
        this.timers = new Map();
        this.controller = vscode.notebooks.createNotebookController('fumbler-notebook-controller', format_1.NOTEBOOK_TYPE, 'Fumbler Notebook');
        this.controller.supportedLanguages = [UNRUNNABLE_LANGUAGE];
        this.controller.supportsExecutionOrder = false;
        this.controller.description = 'Display only';
        this.controller.executeHandler = () => undefined;
        this.controller.onDidChangeSelectedNotebooks((event) => {
            if (event.selected) {
                void this.renderNotebook(event.notebook);
            }
        });
    }
    dispose() {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.controller.dispose();
    }
    preferNotebook(notebook) {
        this.controller.updateNotebookAffinity(notebook, vscode.NotebookControllerAffinity.Preferred);
    }
    async renderNotebook(notebook) {
        this.preferNotebook(notebook);
        await this.renderImageCells(notebook);
        await this.refreshComputed(notebook);
    }
    scheduleRefresh(notebook) {
        const key = notebook.uri.toString();
        const existing = this.timers.get(key);
        if (existing) {
            clearTimeout(existing);
        }
        this.timers.set(key, setTimeout(() => {
            this.timers.delete(key);
            void this.refreshComputed(notebook);
        }, REFRESH_DELAY_MS));
    }
    async renderImageCells(notebook) {
        this.preferNotebook(notebook);
        const imageCells = notebook
            .getCells()
            .filter((cell) => cell.document.languageId === format_1.IMAGE_LANGUAGE_ID);
        for (const cell of imageCells) {
            await this.renderImageCell(cell);
        }
    }
    async renderImageCell(cell) {
        this.preferNotebook(cell.notebook);
        await this.withOutput(cell, () => (0, imageOutput_1.imageOutputForCell)(cell.notebook.uri, cell.document.getText()));
    }
    async refreshComputed(notebook) {
        const key = notebook.uri.toString();
        const generation = (this.generations.get(key) ?? 0) + 1;
        this.generations.set(key, generation);
        const cells = notebook.getCells();
        const pythonCells = cells
            .filter((cell) => cell.document.languageId === format_1.PYTHON_LANGUAGE_ID)
            .map((cell) => ({ index: cell.index, source: cell.document.getText() }));
        const pythonPath = vscode.workspace.getConfiguration('fumbler').get('pythonPath') || 'python3';
        const result = await (0, pythonDefs_1.runPythonCells)(pythonCells, pythonPath);
        if (this.generations.get(key) !== generation) {
            return;
        }
        for (const cell of cells) {
            if (this.generations.get(key) !== generation) {
                return;
            }
            if (cell.document.languageId === format_1.PYTHON_LANGUAGE_ID) {
                const failure = result.failed && result.failed.index === cell.index
                    ? result.failed.error
                    : result.spawnError
                        ? result.spawnError
                        : null;
                await this.withOutput(cell, async () => (failure ? textOutput(failure) : emptyOutput()));
            }
            if (cell.document.languageId === format_1.SVG_LANGUAGE_ID) {
                const resolved = (0, pythonDefs_1.namespaceBefore)(result, cell.index);
                await this.withOutput(cell, async () => {
                    if ('error' in resolved) {
                        return textOutput(resolved.error);
                    }
                    const svg = (0, interpolate_1.interpolate)(cell.document.getText(), resolved.values);
                    return new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.text(svg, 'image/svg+xml'),
                    ]);
                });
            }
        }
    }
    async withOutput(cell, produce) {
        let execution;
        try {
            execution = this.controller.createNotebookCellExecution(cell);
        }
        catch {
            return;
        }
        execution.start();
        try {
            const output = await produce();
            if (output.items.length === 0) {
                await execution.clearOutput();
            }
            else {
                await execution.replaceOutput([output]);
            }
            execution.end(undefined);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            await execution.replaceOutput([
                new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.error(err)]),
            ]);
            execution.end(undefined);
        }
    }
}
exports.FumblerNotebookController = FumblerNotebookController;
function textOutput(message) {
    return new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.text(message)]);
}
function emptyOutput() {
    return new vscode.NotebookCellOutput([]);
}
//# sourceMappingURL=controller.js.map