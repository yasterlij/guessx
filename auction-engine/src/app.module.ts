import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { BullModule } from "@nestjs/bullmq";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PrismaModule } from "./prisma/prisma.module";
import { appConfig } from "./config/env.config";
import { validate } from "./config/env.validation";
import { BiddingModule } from "./modules/bidding/bidding.module";
import { WinnerModule } from "./modules/winner/winner.module";
import { WorkerModule } from "./modules/worker/worker.module";
import { AdminModule } from "./modules/admin/admin.module";
import { PaymentModule } from "./modules/payment/payment.module";
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
    PrismaModule,
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
        secret: config.get("app.jwtSecret"),
        signOptions: { expiresIn: "15m" },
      }),
    }),
    BiddingModule,
    WinnerModule,
    WorkerModule,
    AdminModule,
    PaymentModule,
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
