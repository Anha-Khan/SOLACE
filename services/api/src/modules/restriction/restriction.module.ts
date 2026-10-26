import { Module } from '@nestjs/common';
import { RestrictionController } from './restriction.controller';
import { RestrictionService } from './restriction.service';

@Module({
  controllers: [RestrictionController],
  providers: [RestrictionService],
  exports: [RestrictionService],
})
export class RestrictionModule {}
