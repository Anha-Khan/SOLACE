import { Module } from '@nestjs/common';
import { RestrictionModule } from '../restriction/restriction.module';
import { JobsService } from './jobs.service';

@Module({
  imports: [RestrictionModule],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
