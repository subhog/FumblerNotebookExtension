import * as vscode from 'vscode';
import { IMAGE_LANGUAGE_ID, NOTEBOOK_TYPE } from './format';
import { imageOutputForCell } from './imageOutput';

/** Language no cell uses. Empty supportedLanguages means "all languages" and would show Run. */
const UNRUNNABLE_LANGUAGE = 'fumbler-unrunnable';

export class FumblerNotebookController {
  private readonly controller: vscode.NotebookController;

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
        void this.renderImageCells(event.notebook);
      }
    });
  }

  dispose(): void {
    this.controller.dispose();
  }

  preferNotebook(notebook: vscode.NotebookDocument): void {
    this.controller.updateNotebookAffinity(
      notebook,
      vscode.NotebookControllerAffinity.Preferred
    );
  }

  async renderImageCells(notebook: vscode.NotebookDocument): Promise<void> {
    this.preferNotebook(notebook);
    const imageCells = notebook
      .getCells()
      .filter((cell) => cell.document.languageId === IMAGE_LANGUAGE_ID);
    await this.renderCells(imageCells);
  }

  async renderImageCell(cell: vscode.NotebookCell): Promise<void> {
    this.preferNotebook(cell.notebook);
    await this.renderCells([cell]);
  }

  private async renderCells(cells: vscode.NotebookCell[]): Promise<void> {
    for (const cell of cells) {
      if (cell.document.languageId !== IMAGE_LANGUAGE_ID) {
        continue;
      }
      await this.renderCell(cell);
    }
  }

  private async renderCell(cell: vscode.NotebookCell): Promise<void> {
    let execution: vscode.NotebookCellExecution;
    try {
      execution = this.controller.createNotebookCellExecution(cell);
    } catch {
      return;
    }

    execution.start();
    try {
      const output = await imageOutputForCell(cell.notebook.uri, cell.document.getText());
      await execution.replaceOutput([output]);
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
