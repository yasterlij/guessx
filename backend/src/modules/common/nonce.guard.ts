import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Redis } from "ioredis";
import { InjectRedis } from "./redis.decorator";
import * as crypto from "crypto";

@Injectable()
export class NonceGuard implements CanActivate {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const nonce = request.headers["x-bid-nonce"];
    const timestamp = request.headers["x-bid-timestamp"];

    if (!nonce || !timestamp) {
      throw new HttpException(
        "Missing nonce or timestamp headers",
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = Date.now();
    const requestTime = parseInt(timestamp as string, 10);

    if (Number.isNaN(requestTime) || Math.abs(now - requestTime) > 30000) {
      throw new HttpException(
        "Request timestamp too old. Clock skew detected.",
        HttpStatus.BAD_REQUEST,
      );
    }

    const nonceKey = `nonce:${nonce}`;
    const exists = await this.redis.set(nonceKey, "1", "PX", 60000, "NX");

    if (!exists) {
      throw new HttpException(
        "Duplicate request detected (nonce already used)",
        HttpStatus.CONFLICT,
      );
    }

    return true;
  }
}
