export const NOTEBOOK_TYPE = 'fumbler-notebook';
export const IMAGE_LANGUAGE_ID = 'fumbler-image';

export type FumblerCellType = 'python' | 'markdown' | 'image';

export interface FumblerCell {
  type: FumblerCellType;
  value: string;
}

const DELIMITER = /^\s*# %%(?:\s*(?:\[(\w+)\]|(\w+)))?\s*$/;

export function languageForCellType(type: FumblerCellType): string {
  switch (type) {
    case 'markdown':
      return 'markdown';
    case 'image':
      return IMAGE_LANGUAGE_ID;
    default:
      return 'python';
  }
}

export function cellTypeForLanguage(language: string, isMarkup: boolean): FumblerCellType {
  if (language === IMAGE_LANGUAGE_ID) {
    return 'image';
  }
  if (language === 'markdown' || isMarkup) {
    return 'markdown';
  }
  return 'python';
}

export function parseFumblerSource(text: string): FumblerCell[] {
  const lines = text.split(/\r?\n/);
  const cells: FumblerCell[] = [];
  let currentType: FumblerCellType | null = null;
  let currentLines: string[] = [];
  let sawDelimiter = false;

  const flush = () => {
    if (currentType === null && currentLines.every((line) => line === '')) {
      currentLines = [];
      return;
    }

    const type = currentType ?? 'python';
    let bodyLines = trimTrailingEmpty(currentLines);
    if (sawDelimiter) {
      bodyLines = trimLeadingEmpty(bodyLines);
    }

    const value =
      type === 'markdown' || type === 'image'
        ? uncommentLines(bodyLines).join('\n')
        : bodyLines.join('\n');

    cells.push({ type, value });
    currentLines = [];
  };

  for (const line of lines) {
    const delimiterType = parseDelimiter(line);
    if (delimiterType !== null) {
      flush();
      currentType = delimiterType;
      sawDelimiter = true;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  if (cells.length === 0) {
    return [{ type: 'python', value: '' }];
  }
  return cells;
}

export function serializeFumblerSource(cells: FumblerCell[]): string {
  if (cells.length === 0) {
    return '';
  }

  const parts = cells.map((cell) => {
    const header = cell.type === 'python' ? '# %%' : `# %% [${cell.type}]`;
    const body = cell.type === 'python' ? cell.value : commentLines(cell.value);
    if (body === '') {
      return header;
    }
    return `${header}\n${body}`;
  });

  return `${parts.join('\n\n')}\n`;
}

function parseDelimiter(line: string): FumblerCellType | null {
  const match = line.match(DELIMITER);
  if (!match) {
    return null;
  }
  const raw = (match[1] || match[2] || 'python').toLowerCase();
  if (raw === 'markdown' || raw === 'md') {
    return 'markdown';
  }
  if (raw === 'image' || raw === 'img') {
    return 'image';
  }
  return 'python';
}

function uncommentLines(lines: string[]): string[] {
  return lines.map((line) => {
    if (line.startsWith('# ')) {
      return line.slice(2);
    }
    if (line === '#') {
      return '';
    }
    return line;
  });
}

function commentLines(value: string): string {
  if (value === '') {
    return '';
  }
  return value
    .split('\n')
    .map((line) => (line.length === 0 ? '#' : `# ${line}`))
    .join('\n');
}

function trimTrailingEmpty(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }
  return result;
}

function trimLeadingEmpty(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[0] === '') {
    result.shift();
  }
  return result;
}
