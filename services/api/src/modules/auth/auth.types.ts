import type { Role, UserStatus } from '../../common/enums';

/** Resolved from the database on every request, never from client input. */
export interface AuthenticatedUser {
  id: string;
  role: Role;
  status: UserStatus;
  sessionId: string;
  createdAt: Date;
}

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  role: Role;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  fid: string;
  type: 'refresh';
  /** Registered claim set by JwtService's `jwtid` option; unique per rotation. */
  jti?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
