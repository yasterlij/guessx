import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly secret: string;

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('app.fintechWebhookSecret');
    if (!secret) {
      throw new Error('FINTECH_WEBHOOK_SECRET is not configured');
    }
    this.secret = secret;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-webhook-signature'];
    const timestamp = request.headers['x-webhook-timestamp'];

    if (!signature || !timestamp) {
      throw new ForbiddenException('Missing webhook signature headers');
    }

    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp, 10);
    if (Number.isNaN(ts) || now - ts > 300) {
      throw new ForbiddenException('Webhook timestamp expired');
    }

    const payload: string | Buffer = request.rawBody ?? JSON.stringify(request.body);
    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    return true;
  }
}
