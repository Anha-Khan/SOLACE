import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Error code registry. The single source of truth for API error codes.
 * Mirrored in openapi.yaml and in the Flutter client. Do not add a code
 * without updating both.
 */
export const ERROR_REGISTRY = {
  VALIDATION_FAILED: {
    status: HttpStatus.BAD_REQUEST,
    description: 'Input did not match the contract',
  },
  UNAUTHENTICATED: {
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or expired access token',
  },
  REAUTH_REQUIRED: {
    status: HttpStatus.UNAUTHORIZED,
    description: 'Session older than 4 hours, re-authenticate before opening an alert',
  },
  FORBIDDEN: {
    status: HttpStatus.FORBIDDEN,
    description: 'Role or connection does not allow this action',
  },
  CONSENT_REQUIRED: {
    status: HttpStatus.FORBIDDEN,
    description: 'A required consent item is not granted',
  },
  NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    description: 'Resource does not exist or is not visible',
  },
  CONFLICT: { status: HttpStatus.CONFLICT, description: 'Business rule conflict' },
  ALERT_STATE_INVALID: {
    status: HttpStatus.CONFLICT,
    description: 'Transition not allowed from current state',
  },
  UNDO_WINDOW_CLOSED: { status: HttpStatus.CONFLICT, description: 'The 60-second undo has passed' },
  RATE_LIMITED: { status: HttpStatus.TOO_MANY_REQUESTS, description: 'Too many requests' },
  DEPENDENCY_UNAVAILABLE: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'A required dependency is down',
  },
  INTERNAL_ERROR: { status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Unexpected error' },
} as const;

export type ErrorCode = keyof typeof ERROR_REGISTRY;

export function isErrorCode(value: string): value is ErrorCode {
  return Object.prototype.hasOwnProperty.call(ERROR_REGISTRY, value);
}

export function statusFor(code: ErrorCode): number {
  return ERROR_REGISTRY[code].status;
}

/**
 * A domain error with an explicit, registry-backed API code. Throw this instead
 * of Nest's HttpException so the response shape and code never drift.
 */
export class ApiError extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: number = statusFor(code),
  ) {
    super({ code, message }, status);
  }
}
