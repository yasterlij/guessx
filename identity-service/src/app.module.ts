import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig } from './config/env.config';
import { validate } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { OtpModule } from './modules/otp/otp.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { DisputesModule } from './modules/disputes/dispute.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { HealthController } from './modules/common/health.controller';
import { MetricsController } from './modules/common/metrics.controller';
import { MetricsService } from './modules/common/metrics.service';
import { MetricsInterceptor } from './modules/common/metrics.interceptor';
import { LoggingInterceptor } from './modules/common/logging.interceptor';
import { redis } from './config/redis.config';
import { PrismaModule } from './prisma/prisma.module';
import { BetterAuthModule } from './auth/better-auth.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('app.databaseUrl'),
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwtSecret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    PrismaModule,
    BetterAuthModule,
    AuthModule,
    WalletModule,
    OtpModule,
    NotificationModule,
    AdminModule,
    DisputesModule,
    RbacModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    { provide: 'REDIS_CLIENT', useValue: redis },
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
  exports: ['REDIS_CLIENT', MetricsService],
})
export class AppModule {}