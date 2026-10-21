import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthTokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async generateTokens(
    user: any,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload = {
      sub: user.id,
      phone: user.phone_number || "",
      role: user.role || "user",
      wallet_balance: Number(user.wallet_balance ?? 0),
    };

    const secret =
      this.configService.get<string>("app.jwtSecret") ||
      process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is required to sign access tokens");
    }
    const refreshSecret =
      this.configService.get<string>("app.jwtRefreshSecret") ||
      process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error("JWT_REFRESH_SECRET is required to sign refresh tokens");
    }

    const access_token = this.jwtService.sign(payload, {
      secret,
      expiresIn: "15m",
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: "7d",
    });

    return { access_token, refresh_token };
  }

  verifyRefreshToken(refreshToken: string): any {
    const refreshSecret =
      this.configService.get<string>("app.jwtRefreshSecret") ||
      process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error("JWT_REFRESH_SECRET is required to verify refresh tokens");
    }
    return this.jwtService.verify(refreshToken, {
      secret: refreshSecret,
    });
  }
}
