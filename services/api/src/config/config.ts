import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export type NodeEnv = 'development' | 'test' | 'staging' | 'production';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AppConfig {
  readonly nodeEnv: NodeEnv;
  readonly isProduction: boolean;
  readonly port: number;

  readonly databaseUrl: string;
  readonly migrationDatabaseUrl: string;
  readonly redisUrl: string;

  readonly jwtAccessSecret: string;
  readonly jwtRefreshSecret: string;
  readonly accessTokenTtlMin: number;
  readonly refreshTokenTtlDays: number;

  readonly fieldEncryptionKeyRef: string;

  readonly aiGroqApiKey: string | null;
  readonly aiCerebrasApiKey: string | null;
  readonly aiOpenRouterApiKey: string | null;
  readonly aiCrisisTimeoutMs: number;

  readonly fcmServiceAccountRef: string | null;
  readonly sendgridApiKey: string | null;
  readonly smsProviderKey: string | null;

  readonly sentryDsn: string | null;
  readonly logLevel: LogLevel;
  readonly corsOrigins: readonly string[];

  readonly inviteTtlHours: number;
  readonly freshnessWindowHours: number;
  readonly pauseCapDays: number;

  readonly timerScale: number;
  readonly resourcesVerifiedAt: string;
}

export class ConfigError extends Error {
  constructor(public readonly problems: readonly string[]) {
    super(`Invalid configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

const NODE_ENVS: readonly NodeEnv[] = ['development', 'test', 'staging', 'production'];
const LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];

/**
 * Spec-locked safety values. Production refuses to start when any of these is
 * overridden, per the Configuration section of the plan. These are not tuning
 * knobs; changing one changes patient safety behaviour.
 */
const PRODUCTION_SAFETY_VALUES = {
  freshnessWindowHours: 2,
  inviteTtlHours: 48,
  pauseCapDays: 14,
  timerScale: 1,
  accessTokenTtlMin: 15,
} as const;

function readString(
  raw: NodeJS.ProcessEnv,
  key: string,
  problems: string[],
  options: { required?: boolean; minLength?: number } = {},
): string | null {
  const value = raw[key]?.trim();
  if (!value) {
    if (options.required) problems.push(`${key} is required but was not set`);
    return null;
  }
  if (options.minLength && value.length < options.minLength) {
    problems.push(`${key} must be at least ${options.minLength} characters`);
    return null;
  }
  return value;
}

function readInt(
  raw: NodeJS.ProcessEnv,
  key: string,
  problems: string[],
  options: { required?: boolean; min?: number; max?: number; fallback?: number } = {},
): number {
  const text = raw[key]?.trim();
  if (!text) {
    if (options.required) problems.push(`${key} is required but was not set`);
    return options.fallback ?? 0;
  }
  if (!/^-?\d+$/.test(text)) {
    problems.push(`${key} must be an integer, got "${text}"`);
    return options.fallback ?? 0;
  }
  const value = Number.parseInt(text, 10);
  if (options.min !== undefined && value < options.min) {
    problems.push(`${key} must be >= ${options.min}, got ${value}`);
  }
  if (options.max !== undefined && value > options.max) {
    problems.push(`${key} must be <= ${options.max}, got ${value}`);
  }
  return value;
}

function readUrl(
  raw: NodeJS.ProcessEnv,
  key: string,
  problems: string[],
  schemes: readonly string[],
  required: boolean,
): string | null {
  const value = readString(raw, key, problems, { required });
  if (!value) return null;
  try {
    const url = new URL(value);
    const scheme = url.protocol.replace(':', '');
    if (!schemes.includes(scheme)) {
      problems.push(`${key} must use one of ${schemes.join(', ')}, got "${scheme}"`);
      return null;
    }
    return value;
  } catch {
    problems.push(`${key} must be a valid URL`);
    return null;
  }
}

function isIsoDate(value: string): boolean {
  const time = Date.parse(value);
  return Number.isFinite(time) && value.includes('T');
}

/**
 * Loads, coerces and validates every environment variable. Throws ConfigError
 * naming every problem at once, so a broken deploy fails in one restart, not
 * five. Never reads process.env directly anywhere else in the codebase.
 */
export function loadConfig(raw: NodeJS.ProcessEnv = process.env): AppConfig {
  const envFile = resolve(process.cwd(), '.env');
  if (raw === process.env && existsSync(envFile)) {
    loadDotenv({ path: envFile, quiet: true });
  }

  const problems: string[] = [];

  const nodeEnvText = readString(raw, 'NODE_ENV', problems, { required: true }) ?? 'development';
  if (!NODE_ENVS.includes(nodeEnvText as NodeEnv)) {
    problems.push(`NODE_ENV must be one of ${NODE_ENVS.join(', ')}, got "${nodeEnvText}"`);
  }
  const nodeEnv = nodeEnvText as NodeEnv;
  const isProduction = nodeEnv === 'production';
  const isDeployed = nodeEnv === 'staging' || nodeEnv === 'production';

  const port = readInt(raw, 'PORT', problems, { fallback: 3000, min: 1, max: 65535 });

  const databaseUrl =
    readUrl(raw, 'DATABASE_URL', problems, ['postgresql', 'postgres'], true) ?? '';
  const migrationDatabaseUrl =
    readUrl(raw, 'MIGRATION_DATABASE_URL', problems, ['postgresql', 'postgres'], false) ??
    databaseUrl;
  const redisUrl = readUrl(raw, 'REDIS_URL', problems, ['redis', 'rediss'], true) ?? '';

  const jwtAccessSecret =
    readString(raw, 'JWT_ACCESS_SECRET', problems, { required: true, minLength: 32 }) ?? '';
  const jwtRefreshSecret =
    readString(raw, 'JWT_REFRESH_SECRET', problems, { required: true, minLength: 32 }) ?? '';
  const accessTokenTtlMin = readInt(raw, 'ACCESS_TOKEN_TTL_MIN', problems, {
    fallback: 15,
    min: 1,
    max: 60,
  });
  const refreshTokenTtlDays = readInt(raw, 'REFRESH_TOKEN_TTL_DAYS', problems, {
    fallback: 30,
    min: 1,
    max: 365,
  });

  const fieldEncryptionKeyRef =
    readString(raw, 'FIELD_ENCRYPTION_KEY_REF', problems, { required: true }) ?? '';

  const aiGroqApiKey = readString(raw, 'AI_GROQ_API_KEY', problems, { required: isDeployed });
  const aiCerebrasApiKey = readString(raw, 'AI_CEREBRAS_API_KEY', problems);
  const aiOpenRouterApiKey = readString(raw, 'AI_OPENROUTER_API_KEY', problems);
  const aiCrisisTimeoutMs = readInt(raw, 'AI_CRISIS_TIMEOUT_MS', problems, {
    fallback: 1800,
    min: 100,
    max: 1900,
  });
  if (aiCrisisTimeoutMs >= 2000) {
    problems.push('AI_CRISIS_TIMEOUT_MS must stay under 2000ms (spec 5.6)');
  }

  const fcmServiceAccountRef = readString(raw, 'FCM_SERVICE_ACCOUNT_REF', problems, {
    required: isDeployed,
  });
  const sendgridApiKey = readString(raw, 'SENDGRID_API_KEY', problems, { required: isDeployed });
  const smsProviderKey = readString(raw, 'SMS_PROVIDER_KEY', problems, { required: isDeployed });

  const sentryDsn = readUrl(raw, 'SENTRY_DSN', problems, ['https', 'http'], false);
  const logLevelText = readString(raw, 'LOG_LEVEL', problems) ?? 'info';
  if (!LOG_LEVELS.includes(logLevelText as LogLevel)) {
    problems.push(`LOG_LEVEL must be one of ${LOG_LEVELS.join(', ')}, got "${logLevelText}"`);
  }
  const corsOrigins = (raw.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const inviteTtlHours = readInt(raw, 'INVITE_TTL_HOURS', problems, {
    fallback: 48,
    min: 1,
    max: 720,
  });
  const freshnessWindowHours = readInt(raw, 'FRESHNESS_WINDOW_HOURS', problems, {
    fallback: 2,
    min: 1,
    max: 72,
  });
  const pauseCapDays = readInt(raw, 'PAUSE_CAP_DAYS', problems, { fallback: 14, min: 1, max: 60 });
  const timerScale = readInt(raw, 'TIMER_SCALE', problems, { fallback: 1, min: 1, max: 3600 });

  const resourcesVerifiedAt = readString(raw, 'RESOURCES_VERIFIED_AT', problems, {
    required: true,
  });
  if (resourcesVerifiedAt && !isIsoDate(resourcesVerifiedAt)) {
    problems.push('RESOURCES_VERIFIED_AT must be an ISO-8601 timestamp');
  }

  if (isProduction) {
    if (timerScale !== PRODUCTION_SAFETY_VALUES.timerScale) {
      problems.push('production refuses TIMER_SCALE values other than 1');
    }
    if (freshnessWindowHours !== PRODUCTION_SAFETY_VALUES.freshnessWindowHours) {
      problems.push(
        `production refuses FRESHNESS_WINDOW_HOURS other than ${PRODUCTION_SAFETY_VALUES.freshnessWindowHours} (OD-1)`,
      );
    }
    if (inviteTtlHours !== PRODUCTION_SAFETY_VALUES.inviteTtlHours) {
      problems.push(
        `production refuses INVITE_TTL_HOURS other than ${PRODUCTION_SAFETY_VALUES.inviteTtlHours} (OD-2)`,
      );
    }
    if (pauseCapDays !== PRODUCTION_SAFETY_VALUES.pauseCapDays) {
      problems.push(
        `production refuses PAUSE_CAP_DAYS other than ${PRODUCTION_SAFETY_VALUES.pauseCapDays} (OD-6)`,
      );
    }
    if (accessTokenTtlMin !== PRODUCTION_SAFETY_VALUES.accessTokenTtlMin) {
      problems.push(
        `production refuses ACCESS_TOKEN_TTL_MIN other than ${PRODUCTION_SAFETY_VALUES.accessTokenTtlMin}`,
      );
    }
    if (corsOrigins.length > 0 && corsOrigins.some((origin) => origin === '*')) {
      problems.push('production refuses a wildcard CORS origin');
    }
  }

  if (problems.length > 0) {
    throw new ConfigError(problems);
  }

  return Object.freeze({
    nodeEnv,
    isProduction,
    port,
    databaseUrl,
    migrationDatabaseUrl,
    redisUrl,
    jwtAccessSecret,
    jwtRefreshSecret,
    accessTokenTtlMin,
    refreshTokenTtlDays,
    fieldEncryptionKeyRef,
    aiGroqApiKey,
    aiCerebrasApiKey,
    aiOpenRouterApiKey,
    aiCrisisTimeoutMs,
    fcmServiceAccountRef,
    sendgridApiKey,
    smsProviderKey,
    sentryDsn,
    logLevel: logLevelText as LogLevel,
    corsOrigins: Object.freeze([...corsOrigins]),
    inviteTtlHours,
    freshnessWindowHours,
    pauseCapDays,
    timerScale,
    resourcesVerifiedAt: new Date(resourcesVerifiedAt as string).toISOString(),
  });
}

export const CONFIG = Symbol('APP_CONFIG');
