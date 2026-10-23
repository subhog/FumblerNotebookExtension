import { spawn } from 'child_process';

const PYTHON_TIMEOUT_MS = 15000;

const RUNNER = `
import io, json, sys, traceback

payload = json.load(sys.stdin)
real_stdout = sys.stdout
sys.stdout = io.StringIO()

def export(ns):
    np = None
    try:
        import numpy as np
    except Exception:
        np = None
    out = {}
    for key, value in ns.items():
        if key.startswith("_"):
            continue
        if np is not None:
            if isinstance(value, np.ndarray):
                value = value.tolist()
            elif isinstance(value, np.generic):
                value = value.item()
        try:
            json.dumps(value)
        except (TypeError, ValueError):
            continue
        out[key] = value
    return out

ns = {"__name__": "__main__"}
snapshots = []
failed = None
for cell in payload["cells"]:
    try:
        exec(compile(cell["source"], "python-cell-%s" % cell["index"], "exec"), ns)
    except Exception:
        failed = {"index": cell["index"], "error": traceback.format_exc()}
        break
    snapshots.append({"index": cell["index"], "values": export(ns)})

real_stdout.write(json.dumps({"snapshots": snapshots, "failed": failed}))
real_stdout.flush()
`;

export interface PythonCellSource {
  index: number;
  source: string;
}

export interface PythonSnapshot {
  index: number;
  values: Record<string, unknown>;
}

export interface PythonCellFailure {
  index: number;
  error: string;
}

export interface PythonRunResult {
  snapshots: PythonSnapshot[];
  failed: PythonCellFailure | null;
  spawnError: string | null;
}

export function namespaceBefore(
  result: PythonRunResult,
  cellIndex: number
): { values: Record<string, unknown> } | { error: string } {
  if (result.spawnError) {
    return { error: result.spawnError };
  }
  if (result.failed && result.failed.index < cellIndex) {
    return { error: result.failed.error };
  }
  let values: Record<string, unknown> = {};
  for (const snapshot of result.snapshots) {
    if (snapshot.index < cellIndex) {
      values = snapshot.values;
    } else {
      break;
    }
  }
  return { values };
}

export function runPythonCells(
  cells: PythonCellSource[],
  pythonPath: string
): Promise<PythonRunResult> {
  if (cells.length === 0) {
    return Promise.resolve({ snapshots: [], failed: null, spawnError: null });
  }

  return new Promise((resolve) => {
    const child = spawn(pythonPath, ['-c', RUNNER], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result: PythonRunResult) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish({
        snapshots: [],
        failed: null,
        spawnError: `Python timed out after ${PYTHON_TIMEOUT_MS / 1000}s.`,
      });
    }, PYTHON_TIMEOUT_MS);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      finish({ snapshots: [], failed: null, spawnError: error.message });
    });
    child.on('close', () => {
      try {
        const parsed = JSON.parse(stdout) as {
          snapshots?: PythonSnapshot[];
          failed?: PythonCellFailure | null;
        };
        finish({
          snapshots: parsed.snapshots ?? [],
          failed: parsed.failed ?? null,
          spawnError: null,
        });
      } catch {
        const detail = (stderr || stdout).trim();
        finish({
          snapshots: [],
          failed: null,
          spawnError: detail || `Failed to run ${pythonPath}.`,
        });
      }
    });

    child.stdin.write(JSON.stringify({ cells }));
    child.stdin.end();
  });
}
