import { File, Paths } from 'expo-file-system';

const logFile = new File(Paths.document, 'debug.log');
const MAX_LOG_CHARS = 500_000; // trim oldest entries once the file grows past this

const LEVEL_ORDER = ['debug', 'info', 'warn', 'error', 'fatal'];
let _minLevel = __DEV__ ? 'debug' : 'info';

let writeQueue: Promise<void> = Promise.resolve();

function timestamp(): string {
  return new Date().toISOString();
}

// Strips server URLs (e.g. from LiveKit SDK connect logs) before they hit disk.
function redact(text: string): string {
  return text.replace(/(wss?|https?):\/\/\S+/gi, (_match, scheme) => `${scheme}://<redacted>`);
}

function appendLine(line: string) {
  writeQueue = writeQueue.then(async () => {
    try {
      const existing = logFile.exists ? await logFile.text() : '';
      let next = existing + `[${timestamp()}] ${line}\n`;
      if (next.length > MAX_LOG_CHARS) {
        next = next.slice(next.length - MAX_LOG_CHARS);
      }
      if (!logFile.exists) logFile.create();
      logFile.write(next);
    } catch {
      // best-effort logging, never throw
    }
  });
}

export const debugLog = {
  setLevel(level: string) {
    _minLevel = level;
  },

  log(level: string, message: string, context?: object) {
    if (LEVEL_ORDER.indexOf(level) < LEVEL_ORDER.indexOf(_minLevel)) return;
    const safeMessage = redact(message);
    const safeContext = context ? redact(JSON.stringify(context)) : undefined;
    appendLine(safeContext ? `[${level}] ${safeMessage} ${safeContext}` : `[${level}] ${safeMessage}`);
  },

  async read(): Promise<string> {
    try {
      return logFile.exists ? await logFile.text() : '';
    } catch {
      return '';
    }
  },

  async clear(): Promise<void> {
    try {
      if (logFile.exists) logFile.delete();
    } catch {
      // ignore
    }
  },

  get filePath(): string {
    return logFile.uri;
  },
};
