import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { WalletController } from "./wallet.controller";
import { WalletPinService } from "./wallet-pin.service";
import { WalletService } from "./wallet.service";
import { User } from "../auth/entities/user.entity";
import { Transaction } from "./entities/transaction.entity";

import { redis } from "../../config/redis.config";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [WalletController],
  providers: [
    WalletService,
    WalletPinService,
    { provide: "REDIS_CLIENT", useValue: redis },
  ],
  exports: [WalletService, WalletPinService],
})
export class WalletModule {}
