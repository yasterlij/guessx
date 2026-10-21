import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { appConfig } from "./config/env.config";
import { validate } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { BetterAuthModule } from "./auth/better-auth.module";
import { AuthModule } from "./modules/auth/auth.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { OtpModule } from "./modules/otp/otp.module";
import { NotificationModule } from "./modules/notifications/notification.module";
import { DisputesModule } from "./modules/disputes/dispute.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { BiddingModule } from "./modules/bidding/bidding.module";
import { WinnerModule } from "./modules/winner/winner.module";
import { WorkerModule } from "./modules/worker/worker.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { AuctionsModule } from "./modules/auctions/auctions.module";
import { ProductsModule } from "./modules/products/products.module";
import { FavoritesModule } from "./modules/favorites/favorites.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AdminModule } from "./modules/admin/admin.module";
import { RedisCacheModule } from "./modules/common/redis-cache.module";
import { redisProvider } from "./modules/common/redis.provider";
import { HealthController } from "./modules/common/health.controller";
import { MetricsController } from "./modules/common/metrics.controller";
import { MetricsService } from "./modules/common/metrics.service";
import { MetricsInterceptor } from "./modules/common/metrics.interceptor";
import { LoggingInterceptor } from "./modules/common/logging.interceptor";

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
        type: "postgres",
        url: config.get<string>("app.databaseUrl"),
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: new URL(config.get<string>("app.redisUrl")!).hostname,
          port: parseInt(
            new URL(config.get<string>("app.redisUrl")!).port || "6379",
            10,
          ),
        },
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("app.jwtSecret"),
        signOptions: { expiresIn: "15m" },
      }),
    }),
    PrismaModule,
    RedisCacheModule,
    BetterAuthModule,
    AuthModule,
    WalletModule,
    OtpModule,
    NotificationModule,
    DisputesModule,
    RbacModule,
    BiddingModule,
    WinnerModule,
    WorkerModule,
    PaymentModule,
    AuctionsModule,
    ProductsModule,
    FavoritesModule,
    AuditModule,
    AdminModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    redisProvider,
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
  exports: [redisProvider, MetricsService],
})
export class AppModule {}
