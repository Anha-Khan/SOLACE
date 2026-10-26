import { Module } from '@nestjs/common';
import { CrisisModule } from '../crisis/crisis.module';
import { SyncController } from './sync.controller';

@Module({
  imports: [CrisisModule],
  controllers: [SyncController],
})
export class SyncModule {}
