import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';
import type { LogLevel } from '../config/config';
import { REDACTED, redactObject } from './redaction';

export type Logger = PinoLogger;

export interface CreateLoggerOptions {
  level: LogLevel;
  pretty: boolean;
  /** Injectable destination for tests. */
  destination?: NodeJS.WritableStream;
}

/**
 * Structured logger with redaction applied twice: pino's own path redaction and
 * a deep key-based pass in the formatter, so a sensitive key is caught even when
 * it sits at an unexpected depth.
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const base: LoggerOptions = {
    level: options.level,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      log(object: Record<string, unknown>) {
        return redactObject(object) as Record<string, unknown>;
      },
    },
  };

  if (!options.pretty) {
    return options.destination ? pino(base, options.destination) : pino(base);
  }

  const prettyTransport = pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      singleLine: true,
      translateTime: 'SYS:HH:MM:ss.l',
      ignore: 'pid,hostname',
      messageFormat: '{msg}',
      // A writable stream destination is only meaningful for tests using the
      // non-pretty branch; pino-pretty accepts a file descriptor here.
      destination: typeof options.destination === 'number' ? options.destination : undefined,
    },
  });
  return pino(base, prettyTransport);
}

/** Censor helper kept for tests that assert the exact marker. */
export const REDACTION_MARKER = REDACTED;
