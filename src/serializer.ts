import * as vscode from 'vscode';
import {
  cellTypeForLanguage,
  FumblerCell,
  languageForCellType,
  parseFumblerSource,
  serializeFumblerSource,
} from './format';

export class FumblerNotebookSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(
    content: Uint8Array,
    _token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    const text = new TextDecoder().decode(content);
    const parsed = parseFumblerSource(text);
    const cells = parsed.map(toNotebookCell);
    return new vscode.NotebookData(cells);
  }

  async serializeNotebook(
    data: vscode.NotebookData,
    _token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    const cells: FumblerCell[] = data.cells.map((cell) => ({
      type: cellTypeForLanguage(
        cell.languageId,
        cell.kind === vscode.NotebookCellKind.Markup
      ),
      value: cell.value,
    }));
    return new TextEncoder().encode(serializeFumblerSource(cells));
  }
}

function toNotebookCell(cell: FumblerCell): vscode.NotebookCellData {
  const language = languageForCellType(cell.type);
  const kind =
    cell.type === 'markdown'
      ? vscode.NotebookCellKind.Markup
      : vscode.NotebookCellKind.Code;
  return new vscode.NotebookCellData(kind, cell.value, language);
}
