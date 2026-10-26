import { Global, Module } from '@nestjs/common';
import { CONFIG } from '../../config/config';
import type { AppConfig } from '../../config/config';
import { FieldEncryptionService } from './field-encryption.service';
import { createKeyProvider, KEY_PROVIDER } from './key-provider';

@Global()
@Module({
  providers: [
    {
      provide: KEY_PROVIDER,
      useFactory: (config: AppConfig) => createKeyProvider(config),
      inject: [CONFIG],
    },
    FieldEncryptionService,
  ],
  exports: [KEY_PROVIDER, FieldEncryptionService],
})
export class CryptoModule {}
