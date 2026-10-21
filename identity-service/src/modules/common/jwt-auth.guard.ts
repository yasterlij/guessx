import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  Inject,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Redis } from "ioredis";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Optional() private readonly jwtService?: JwtService,
    @Optional() @Inject("REDIS_CLIENT") private readonly redis?: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException("No auth token");
    }
    if (!this.jwtService) {
      throw new UnauthorizedException('Authentication service unavailable');
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");
    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (payload.is_banned) {
        throw new UnauthorizedException("User account is banned");
      }
      if (this.redis && typeof this.redis.sismember === "function") {
        try {
          const isBanned = await this.redis.sismember(
            "guessx:banned-users",
            payload.sub,
          );
          if (isBanned) {
            throw new UnauthorizedException("User account is banned");
          }
        } catch (e) {
          if (e instanceof UnauthorizedException) throw e;
        }
      }
      request.user = {
        id: payload.sub,
        phone: payload.phone,
        role: payload.role,
        wallet_balance: payload.wallet_balance,
        is_banned: payload.is_banned,
        tc_accepted: payload.tc_accepted,
      };
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
