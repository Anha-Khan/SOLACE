import { SetMetadata } from '@nestjs/common';
import type { Role } from '../enums';

export const ROLES_KEY = 'roles';

/** Restricts a route to the listed server-assigned roles (ADR-8). */
export const Roles = (...roles: readonly Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
