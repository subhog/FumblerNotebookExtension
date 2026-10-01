import * as vscode from 'vscode';
import { FumblerNotebookController } from './controller';
import { IMAGE_LANGUAGE_ID, NOTEBOOK_TYPE } from './format';
import { FumblerNotebookSerializer } from './serializer';

export function activate(context: vscode.ExtensionContext): void {
  const controller = new FumblerNotebookController();

  context.subscriptions.push(
    controller,
    vscode.workspace.registerNotebookSerializer(NOTEBOOK_TYPE, new FumblerNotebookSerializer(), {
      transientOutputs: true,
    }),
    vscode.workspace.onDidOpenNotebookDocument((notebook) => {
      if (notebook.notebookType === NOTEBOOK_TYPE) {
        void controller.renderImageCells(notebook);
      }
    }),
    vscode.workspace.onDidChangeNotebookDocument((event) => {
      if (event.notebook.notebookType !== NOTEBOOK_TYPE) {
        return;
      }
      for (const change of event.cellChanges) {
        if (!change.document) {
          continue;
        }
        if (change.cell.document.languageId === IMAGE_LANGUAGE_ID) {
          void controller.renderImageCell(change.cell);
        }
      }
      for (const contentChange of event.contentChanges) {
        for (const cell of contentChange.addedCells) {
          if (cell.document.languageId === IMAGE_LANGUAGE_ID) {
            void controller.renderImageCell(cell);
          }
        }
      }
    }),
    vscode.commands.registerCommand('fumbler-notebook.insertImageCell', async () => {
      const editor = vscode.window.activeNotebookEditor;
      if (!editor || editor.notebook.notebookType !== NOTEBOOK_TYPE) {
        vscode.window.showErrorMessage('Open a Fumbler notebook to insert an Image cell.');
        return;
      }

      const cell = new vscode.NotebookCellData(
        vscode.NotebookCellKind.Code,
        'assets/sample.svg',
        IMAGE_LANGUAGE_ID
      );
      const index = editor.selections[0]?.end ?? editor.notebook.cellCount;
      const edit = new vscode.WorkspaceEdit();
      edit.set(editor.notebook.uri, [vscode.NotebookEdit.insertCells(index, [cell])]);
      await vscode.workspace.applyEdit(edit);
    })
  );

  for (const notebook of vscode.workspace.notebookDocuments) {
    if (notebook.notebookType === NOTEBOOK_TYPE) {
      void controller.renderImageCells(notebook);
    }
  }
}

export function deactivate(): void {}
