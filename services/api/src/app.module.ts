import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppConfigModule } from './config/app-config.module';
import { LoggerModule } from './common/logger.module';
import { PrismaModule } from './common/prisma.module';
import { RedisModule } from './common/redis.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { createValidationPipe } from './common/validation';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [AppConfigModule, LoggerModule, PrismaModule, RedisModule, HealthModule],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
