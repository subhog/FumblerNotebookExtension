import * as vscode from 'vscode';
import { FumblerNotebookController } from './controller';
import {
  FREECAD_LANGUAGE_ID,
  IMAGE_LANGUAGE_ID,
  NOTEBOOK_TYPE,
  PYTHON_LANGUAGE_ID,
  SVG_LANGUAGE_ID,
} from './format';
import { placeholderImageOutput } from './imageOutput';
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
        void controller.renderNotebook(notebook);
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
        const languageId = change.cell.document.languageId;
        if (languageId === IMAGE_LANGUAGE_ID) {
          void controller.renderImageCell(change.cell);
        } else if (languageId === PYTHON_LANGUAGE_ID || languageId === SVG_LANGUAGE_ID) {
          controller.scheduleRefresh(event.notebook);
        }
      }
      for (const contentChange of event.contentChanges) {
        for (const cell of contentChange.addedCells) {
          if (cell.document.languageId === IMAGE_LANGUAGE_ID) {
            void controller.renderImageCell(cell);
          }
        }
        const structural = [...contentChange.addedCells, ...contentChange.removedCells];
        if (
          structural.some(
            (cell) =>
              cell.document.languageId === PYTHON_LANGUAGE_ID ||
              cell.document.languageId === SVG_LANGUAGE_ID
          )
        ) {
          controller.scheduleRefresh(event.notebook);
        }
      }
    }),
    vscode.commands.registerCommand('fumbler-notebook.insertImageCell', () =>
      insertCell(
        new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          'assets/sample.svg',
          IMAGE_LANGUAGE_ID
        ),
        'Image'
      )
    ),
    vscode.commands.registerCommand('fumbler-notebook.insertPythonCell', () =>
      insertCell(
        new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          'import math\nwidth = 320\nheight = 120\n',
          PYTHON_LANGUAGE_ID
        ),
        'Python'
      )
    ),
    vscode.commands.registerCommand('fumbler-notebook.insertFreecadCell', () =>
      insertCell(
        new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          'import FreeCAD\n',
          FREECAD_LANGUAGE_ID
        ),
        'FreeCAD'
      )
    ),
    vscode.commands.registerCommand('fumbler-notebook.insertSvgCell', () =>
      insertCell(
        new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          '<svg xmlns="http://www.w3.org/2000/svg" width="{{width}}" height="{{height}}">\n</svg>\n',
          SVG_LANGUAGE_ID
        ),
        'SVG'
      )
    )
  );

  for (const notebook of vscode.workspace.notebookDocuments) {
    if (notebook.notebookType === NOTEBOOK_TYPE) {
      void controller.renderNotebook(notebook);
    }
  }
}

async function insertCell(cell: vscode.NotebookCellData, label: string): Promise<void> {
  const editor = vscode.window.activeNotebookEditor;
  if (!editor || editor.notebook.notebookType !== NOTEBOOK_TYPE) {
    vscode.window.showErrorMessage(`Open a Fumbler notebook to insert a ${label} cell.`);
    return;
  }
  if (cell.languageId === IMAGE_LANGUAGE_ID) {
    const placeholder = placeholderImageOutput(cell.value);
    if (placeholder) {
      cell.outputs = [placeholder];
    }
  }
  const index = editor.selections[0]?.end ?? editor.notebook.cellCount;
  const edit = new vscode.WorkspaceEdit();
  edit.set(editor.notebook.uri, [vscode.NotebookEdit.insertCells(index, [cell])]);
  await vscode.workspace.applyEdit(edit);
}

export function deactivate(): void {}
