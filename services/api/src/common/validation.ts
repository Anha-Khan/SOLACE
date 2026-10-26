import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

function flatten(errors: readonly ValidationError[], parent = ''): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints) {
      messages.push(...Object.values(error.constraints).map((text) => `${path}: ${text}`));
    }
    if (error.children && error.children.length > 0) {
      messages.push(...flatten(error.children, path));
    }
  }
  return messages;
}

/**
 * Boundary validation. Unknown fields are rejected rather than ignored, so a
 * client cannot smuggle a server-owned field (stage, alert state, role) into a
 * DTO that forgot to exclude it.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,
    exceptionFactory: (errors: ValidationError[]) => {
      const messages = flatten(errors);
      return new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: messages.length > 0 ? messages.join('; ') : 'Input did not match the contract',
      });
    },
  });
}
