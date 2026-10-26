import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppConfigModule } from './config/app-config.module';
import { LoggerModule } from './common/logger.module';
import { PrismaModule } from './common/prisma.module';
import { RedisModule } from './common/redis.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { createValidationPipe } from './common/validation';
import { CheckInsModule } from './modules/checkins/checkins.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConsentModule } from './modules/consent/consent.module';
import { HealthModule } from './modules/health/health.module';
import { CrisisModule } from './modules/crisis/crisis.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { PatientsModule } from './modules/patients/patients.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SafetyPlanModule } from './modules/safety-plan/safety-plan.module';
import { StageModule } from './modules/stage/stage.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { RestrictionModule } from './modules/restriction/restriction.module';
import { JournalModule } from './modules/journal/journal.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { SyncModule } from './modules/sync/sync.module';
import { TherapistModule } from './modules/therapist/therapist.module';
import { PrivacyModule } from './modules/privacy/privacy.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    PrismaModule,
    RedisModule,
    CryptoModule,
    HealthModule,
    AuthModule,
    ConsentModule,
    CrisisModule,
    NotificationsModule,
    SafetyPlanModule,
    PrivacyModule,
    SurveysModule,
    SyncModule,
    AiModule,
    CheckInsModule,
    JournalModule,
    JobsModule,
    PatientsModule,
    RestrictionModule,
    StageModule,
    TasksModule,
    TherapistModule,
  ],
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
