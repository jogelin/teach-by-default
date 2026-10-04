// Shared logger. Every log line in this service goes through it.
type Fields = Record<string, string | number | boolean>;

function write(level: 'debug' | 'info' | 'warn' | 'error', message: string, fields: Fields = {}) {
  process.stdout.write(JSON.stringify({ level, message, ...fields, at: new Date().toISOString() }) + '\n');
}

export const logger = {
  debug: (message: string, fields?: Fields) => write('debug', message, fields),
  info: (message: string, fields?: Fields) => write('info', message, fields),
  warn: (message: string, fields?: Fields) => write('warn', message, fields),
  error: (message: string, fields?: Fields) => write('error', message, fields),
};
