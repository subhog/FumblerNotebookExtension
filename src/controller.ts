import * as vscode from 'vscode';
import {
  IMAGE_LANGUAGE_ID,
  NOTEBOOK_TYPE,
  PYTHON_LANGUAGE_ID,
  SVG_LANGUAGE_ID,
} from './format';
import { imageOutputForCell } from './imageOutput';
import { interpolate } from './interpolate';
import { namespaceBefore, runPythonCells } from './pythonDefs';

/** Language no cell uses. Empty supportedLanguages means "all languages" and would show Run. */
const UNRUNNABLE_LANGUAGE = 'fumbler-unrunnable';
const REFRESH_DELAY_MS = 300;

export class FumblerNotebookController {
  private readonly controller: vscode.NotebookController;
  private readonly generations = new Map<string, number>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    this.controller = vscode.notebooks.createNotebookController(
      'fumbler-notebook-controller',
      NOTEBOOK_TYPE,
      'Fumbler Notebook'
    );
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

  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.controller.dispose();
  }

  preferNotebook(notebook: vscode.NotebookDocument): void {
    this.controller.updateNotebookAffinity(
      notebook,
      vscode.NotebookControllerAffinity.Preferred
    );
  }

  async renderNotebook(notebook: vscode.NotebookDocument): Promise<void> {
    this.preferNotebook(notebook);
    await this.renderImageCells(notebook);
    await this.refreshComputed(notebook);
  }

  scheduleRefresh(notebook: vscode.NotebookDocument): void {
    const key = notebook.uri.toString();
    const existing = this.timers.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        void this.refreshComputed(notebook);
      }, REFRESH_DELAY_MS)
    );
  }

  async renderImageCells(notebook: vscode.NotebookDocument): Promise<void> {
    this.preferNotebook(notebook);
    const imageCells = notebook
      .getCells()
      .filter((cell) => cell.document.languageId === IMAGE_LANGUAGE_ID);
    for (const cell of imageCells) {
      await this.renderImageCell(cell);
    }
  }

  async renderImageCell(cell: vscode.NotebookCell): Promise<void> {
    this.preferNotebook(cell.notebook);
    await this.withOutput(cell, () => imageOutputForCell(cell.notebook.uri, cell.document.getText()));
  }

  private async refreshComputed(notebook: vscode.NotebookDocument): Promise<void> {
    const key = notebook.uri.toString();
    const generation = (this.generations.get(key) ?? 0) + 1;
    this.generations.set(key, generation);

    const cells = notebook.getCells();
    const pythonCells = cells
      .filter((cell) => cell.document.languageId === PYTHON_LANGUAGE_ID)
      .map((cell) => ({ index: cell.index, source: cell.document.getText() }));
    const pythonPath =
      vscode.workspace.getConfiguration('fumbler').get<string>('pythonPath') || 'python3';
    const result = await runPythonCells(pythonCells, pythonPath);
    if (this.generations.get(key) !== generation) {
      return;
    }

    for (const cell of cells) {
      if (this.generations.get(key) !== generation) {
        return;
      }
      if (cell.document.languageId === PYTHON_LANGUAGE_ID) {
        const failure =
          result.failed && result.failed.index === cell.index
            ? result.failed.error
            : result.spawnError
              ? result.spawnError
              : null;
        await this.withOutput(cell, async () => (failure ? textOutput(failure) : emptyOutput()));
      }
      if (cell.document.languageId === SVG_LANGUAGE_ID) {
        const resolved = namespaceBefore(result, cell.index);
        await this.withOutput(cell, async () => {
          if ('error' in resolved) {
            return textOutput(resolved.error);
          }
          const svg = interpolate(cell.document.getText(), resolved.values);
          return new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(svg, 'image/svg+xml'),
          ]);
        });
      }
    }
  }

  private async withOutput(
    cell: vscode.NotebookCell,
    produce: () => vscode.NotebookCellOutput | Promise<vscode.NotebookCellOutput>
  ): Promise<void> {
    let execution: vscode.NotebookCellExecution;
    try {
      execution = this.controller.createNotebookCellExecution(cell);
    } catch {
      return;
    }

    execution.start();
    try {
      const output = await produce();
      if (output.items.length === 0) {
        await execution.clearOutput();
      } else {
        await execution.replaceOutput([output]);
      }
      execution.end(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await execution.replaceOutput([
        new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.error(err)]),
      ]);
      execution.end(undefined);
    }
  }
}

function textOutput(message: string): vscode.NotebookCellOutput {
  return new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.text(message)]);
}

function emptyOutput(): vscode.NotebookCellOutput {
  return new vscode.NotebookCellOutput([]);
}
