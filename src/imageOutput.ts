import * as path from 'path';
import * as vscode from 'vscode';

const NATIVE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const HTML_MIME: Record<string, string> = {
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

export function imageRefFromCellText(text: string): string {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

export async function imageOutputForCell(
  notebookUri: vscode.Uri,
  cellText: string
): Promise<vscode.NotebookCellOutput> {
  const ref = imageRefFromCellText(cellText);
  if (!ref) {
    return textOutput('Image cell is empty. Enter a relative path or URL.');
  }

  try {
    const { data, mime } = await loadImage(notebookUri, ref);
    return outputForImage(data, mime);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return textOutput(message);
  }
}

function textOutput(message: string): vscode.NotebookCellOutput {
  return new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.text(message)]);
}

function outputForImage(data: Uint8Array, mime: string): vscode.NotebookCellOutput {
  if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/svg+xml') {
    return new vscode.NotebookCellOutput([new vscode.NotebookCellOutputItem(data, mime)]);
  }

  const base64 = Buffer.from(data).toString('base64');
  const html = `<img src="data:${mime};base64,${base64}" />`;
  return new vscode.NotebookCellOutput([
    vscode.NotebookCellOutputItem.text(html, 'text/html'),
  ]);
}

async function loadImage(
  notebookUri: vscode.Uri,
  ref: string
): Promise<{ data: Uint8Array; mime: string }> {
  if (/^https?:\/\//i.test(ref)) {
    return loadFromUrl(ref);
  }

  const uri = resolveLocalUri(notebookUri, ref);
  try {
    const data = await vscode.workspace.fs.readFile(uri);
    return { data, mime: mimeFromPath(uri.path) };
  } catch {
    throw new Error(`Could not read image: ${ref}`);
  }
}

function resolveLocalUri(notebookUri: vscode.Uri, ref: string): vscode.Uri {
  if (ref.startsWith('file://')) {
    return vscode.Uri.parse(ref);
  }
  if (path.isAbsolute(ref)) {
    return vscode.Uri.file(ref);
  }
  const notebookDir = vscode.Uri.joinPath(notebookUri, '..');
  return vscode.Uri.joinPath(notebookDir, ref);
}

async function loadFromUrl(url: string): Promise<{ data: Uint8Array; mime: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status}): ${url}`);
  }
  const data = new Uint8Array(await response.arrayBuffer());
  const headerMime = response.headers.get('content-type')?.split(';')[0]?.trim();
  const mime =
    headerMime && headerMime.startsWith('image/') ? headerMime : mimeFromPath(url);
  return { data, mime };
}

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath.split('?')[0]).toLowerCase();
  return NATIVE_MIME[ext] ?? HTML_MIME[ext] ?? 'image/png';
}
