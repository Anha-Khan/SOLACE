import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ConsentService } from './consent.service';
import { SetConsentDto, StartWithdrawalDto } from './dto/consent.dto';

@Controller('v1/consents')
@Roles('patient')
export class ConsentController {
  constructor(private readonly consent: ConsentService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): ReturnType<ConsentService['list']> {
    return this.consent.list(user);
  }

  @Get('history')
  history(@CurrentUser() user: AuthenticatedUser): ReturnType<ConsentService['history']> {
    return this.consent.history(user);
  }

  @Put(':item')
  set(
    @CurrentUser() user: AuthenticatedUser,
    @Param('item') item: string,
    @Body() dto: SetConsentDto,
  ): ReturnType<ConsentService['set']> {
    return this.consent.set(user, item, dto);
  }

  @Post('crisis-monitoring/withdrawals')
  @HttpCode(HttpStatus.CREATED)
  startWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartWithdrawalDto,
  ): ReturnType<ConsentService['startWithdrawal']> {
    return this.consent.startWithdrawal(user, dto.clientId);
  }

  @Post('crisis-monitoring/withdrawals/:id/confirm')
  @HttpCode(HttpStatus.OK)
  confirmWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): ReturnType<ConsentService['confirmWithdrawal']> {
    return this.consent.confirmWithdrawal(user, id);
  }
}
