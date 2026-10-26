import { Global, Module } from '@nestjs/common';
import { CONFIG, loadConfig } from './config';

/** Global config provider. Fails the boot when the environment is invalid. */
@Global()
@Module({
  providers: [
    {
      provide: CONFIG,
      useFactory: () => loadConfig(),
    },
  ],
  exports: [CONFIG],
})
export class AppConfigModule {}
