import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { MeController } from './me.controller';
import { PasswordService } from './password.service';
import { SessionRepository } from './session.repository';
import { TokenService } from './token.service';
import { UserRepository } from './user.repository';

@Module({
  imports: [
    JwtModule.register({}),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
  ],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    UserRepository,
    SessionRepository,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [SessionRepository, PasswordService, TokenService, UserRepository],
})
export class AuthModule {}
