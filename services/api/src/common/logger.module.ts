import { Global, Module, type Provider } from '@nestjs/common';
import type { Logger } from 'pino';
import { CONFIG } from '../config/config';
import type { AppConfig } from '../config/config';
import { createLogger } from './logger';

export const LOGGER = Symbol('LOGGER');

const loggerProvider: Provider = {
  provide: LOGGER,
  inject: [CONFIG],
  useFactory: (config: AppConfig): Logger =>
    createLogger({
      level: config.logLevel,
      pretty: !config.isProduction && config.nodeEnv !== 'test',
    }),
};

@Global()
@Module({
  providers: [loggerProvider],
  exports: [LOGGER],
})
export class LoggerModule {}
