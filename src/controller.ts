import * as vscode from 'vscode';
import { IMAGE_LANGUAGE_ID, NOTEBOOK_TYPE } from './format';
import { imageOutputForCell } from './imageOutput';

export class FumblerNotebookController {
  private readonly controller: vscode.NotebookController;
  private executionOrder = 0;

  constructor() {
    this.controller = vscode.notebooks.createNotebookController(
      'fumbler-notebook-controller',
      NOTEBOOK_TYPE,
      'Fumbler Notebook'
    );
    this.controller.supportedLanguages = ['python', IMAGE_LANGUAGE_ID];
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

  dispose(): void {
    this.controller.dispose();
  }

  async renderImageCells(notebook: vscode.NotebookDocument): Promise<void> {
    const imageCells = notebook
      .getCells()
      .filter((cell) => cell.document.languageId === IMAGE_LANGUAGE_ID);
    await this.executeCells(imageCells);
  }

  async renderImageCell(cell: vscode.NotebookCell): Promise<void> {
    await this.executeCells([cell]);
  }

  private async executeCells(cells: vscode.NotebookCell[]): Promise<void> {
    for (const cell of cells) {
      await this.executeCell(cell);
    }
  }

  private async executeCell(cell: vscode.NotebookCell): Promise<void> {
    let execution: vscode.NotebookCellExecution;
    try {
      execution = this.controller.createNotebookCellExecution(cell);
    } catch {
      return;
    }
    execution.executionOrder = ++this.executionOrder;
    execution.start(Date.now());

    try {
      if (cell.document.languageId === IMAGE_LANGUAGE_ID) {
        const output = await imageOutputForCell(
          cell.notebook.uri,
          cell.document.getText()
        );
        execution.replaceOutput([output]);
      } else {
        execution.replaceOutput([
          new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(
              'Python execution is not implemented in this scaffold.'
            ),
          ]),
        ]);
      }
      execution.end(true, Date.now());
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      execution.replaceOutput([
        new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.error(err)]),
      ]);
      execution.end(false, Date.now());
    }
  }
}
