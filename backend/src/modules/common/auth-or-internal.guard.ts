import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class AuthOrInternalGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  private matchesInternalKey(apiKey: unknown, expected: string | undefined): boolean {
    if (!expected || !apiKey) return false;
    const a = Buffer.from(String(apiKey));
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-internal-api-key'];
    const expected = this.configService.get<string>('app.internalApiKey');

    if (this.matchesInternalKey(apiKey, expected)) {
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('No auth token');

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}