import { File, Paths } from 'expo-file-system';

const logFile = new File(Paths.document, 'debug.log');
const MAX_LOG_CHARS = 500_000; // trim oldest entries once the file grows past this

let writeQueue: Promise<void> = Promise.resolve();

function timestamp(): string {
  return new Date().toISOString();
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
  log(message: string, context?: object) {
    appendLine(context ? `${message} ${JSON.stringify(context)}` : message);
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
