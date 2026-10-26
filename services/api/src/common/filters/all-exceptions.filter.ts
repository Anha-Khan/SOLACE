import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Inject } from '@nestjs/common';
import { LOGGER } from '../logger.module';
import type { Logger } from 'pino';
import { isErrorCode, type ErrorCode } from '../errors';
import { errorEnvelope } from '../envelope';

interface HttpErrorPayload {
  code?: unknown;
  message?: unknown;
}

function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'VALIDATION_FAILED';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHENTICATED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMITED';
    case HttpStatus.SERVICE_UNAVAILABLE:
      return 'DEPENDENCY_UNAVAILABLE';
    default:
      return 'INTERNAL_ERROR';
  }
}

/**
 * One response shape for every failure. Never leaks a stack trace. Logs the
 * error with request id, route and user id, never the request body (Global Rule 4).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string; user?: { id: string } }>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let code: ErrorCode = codeForStatus(status);
    let message = 'An unexpected error occurred';

    if (isHttp) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const body = payload as HttpErrorPayload;
        if (typeof body.code === 'string' && isErrorCode(body.code)) {
          code = body.code;
        }
        if (Array.isArray(body.message)) {
          message = body.message.join('; ');
        } else if (typeof body.message === 'string') {
          message = body.message;
        }
      }
    }

    const context = {
      requestId: request.id ?? null,
      route: request.route?.path ?? request.path,
      method: request.method,
      status,
      code,
      userId: request.user?.id ?? null,
    };

    if (status >= 500) {
      this.logger.error({ ...context, err: exception }, 'request failed');
    } else {
      this.logger.warn(context, 'request rejected');
    }

    response.status(status).json(errorEnvelope(code, message));
  }
}
