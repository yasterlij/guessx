import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(private configService: ConfigService) {}

  async logFailedLogin(
    identifier: string,
    actorId: string,
    reason: string,
  ): Promise<void> {
    this.logger.warn(`Failed login attempt for ${identifier}, reason: ${reason}`);
    try {
      const internalApiKey = this.configService.get<string>('app.internalApiKey');
      if (!internalApiKey) return;
      await fetch('http://localhost:3000/api/v1/admin/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': internalApiKey,
        },
        body: JSON.stringify({
          actor_id: actorId,
          actor_phone: identifier,
          action: 'LOGIN_FAILED',
          entity_type: 'user',
          entity_id: actorId,
          details: { reason, timestamp: new Date().toISOString() },
        }),
      });
    } catch (e: unknown) {
      this.logger.warn(`Failed to log login attempt: ${(e instanceof Error ? e.message : String(e))}`);
    }
  }
}