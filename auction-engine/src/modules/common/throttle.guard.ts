import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Redis } from "ioredis";
import { InjectRedis } from "./redis.decorator";

@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly windowMs = 1000;
  private readonly maxRequests = 10;

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;
    const key = `ratelimit:bid:${userId}`;

    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.pexpire(key, this.windowMs);
    }

    if (current > this.maxRequests) {
      throw new HttpException(
        "Too many requests. Please slow down.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
