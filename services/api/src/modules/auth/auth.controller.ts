import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from './auth.types';
import { AuthService } from './auth.service';
import { LoginDto, LogoutDto, RefreshDto, SignupDto } from './dto/auth.dto';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  signup(@Body() dto: SignupDto): ReturnType<AuthService['signup']> {
    return this.auth.signup(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  login(@Body() dto: LoginDto): ReturnType<AuthService['login']> {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  refresh(@Body() dto: RefreshDto): ReturnType<AuthService['refresh']> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutDto,
  ): ReturnType<AuthService['logout']> {
    return this.auth.logout(user, dto.refreshToken);
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: AuthenticatedUser): ReturnType<AuthService['listSessions']> {
    return this.auth.listSessions(user);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): ReturnType<AuthService['revokeSession']> {
    return this.auth.revokeSession(user, id);
  }
}
