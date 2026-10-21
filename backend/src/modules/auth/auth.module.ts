import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthAuditService } from "./auth-audit.service";
import { AuthService } from "./auth.service";
import { AuthTokenService } from "./auth-token.service";
import { User } from "./entities/user.entity";
import { SuperAppRegistry } from "./adapters/super-app-registry";

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("app.jwtSecret"),
        signOptions: { expiresIn: "15m" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    AuthAuditService,
    SuperAppRegistry,
  ],
  exports: [SuperAppRegistry, AuthTokenService, AuthAuditService],
})
export class AuthModule {}
