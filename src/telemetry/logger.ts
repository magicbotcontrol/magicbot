type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function formatMessage(level: LogLevel, scope: string, message: string, meta?: unknown) {
  const stamp = new Date().toISOString();
  const base = `[${stamp}] [${level}] [${scope}] ${message}`;
  if (meta === undefined) return base;
  return `${base} ${JSON.stringify(meta)}`;
}

export class Logger {
  constructor(private readonly scope = 'worker') {}

  child(scope: string) {
    return new Logger(`${this.scope}:${scope}`);
  }

  info(message: string, meta?: unknown) {
    console.log(formatMessage('INFO', this.scope, message, meta));
  }

  warn(message: string, meta?: unknown) {
    console.warn(formatMessage('WARN', this.scope, message, meta));
  }

  error(message: string, meta?: unknown) {
    console.error(formatMessage('ERROR', this.scope, message, meta));
  }

  debug(message: string, meta?: unknown) {
    if (process.env.NODE_ENV === 'production') return;
    console.debug(formatMessage('DEBUG', this.scope, message, meta));
  }
}
