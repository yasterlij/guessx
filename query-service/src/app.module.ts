import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { appConfig } from './config/env.config';
import { validate } from './config/env.validation';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { ProductsModule } from './modules/products/products.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from "./modules/common/audit/audit.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { RedisCacheModule } from './modules/common/redis-cache.module';
import { HealthController } from './modules/common/health.controller';
import { MetricsController } from './modules/common/metrics.controller';
import { MetricsService } from './modules/common/metrics.service';
import { MetricsInterceptor } from './modules/common/metrics.interceptor';
import { LoggingInterceptor } from './modules/common/logging.interceptor';
import { JwtAuthGuard } from './modules/common/jwt-auth.guard';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
    }),
    PrismaModule,
    RedisCacheModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('app.jwtSecret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    AuctionsModule,
    ProductsModule,
    FavoritesModule,
    AdminModule,
    AuditModule,
    RbacModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    JwtAuthGuard,
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
