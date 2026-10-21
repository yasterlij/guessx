import { Injectable, Logger, Optional } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(
    @Optional() private auditService?: AuditService,
  ) {}

  async logFailedLogin(
    identifier: string,
    actorId: string,
    reason: string,
  ): Promise<void> {
    this.logger.warn(`Failed login attempt for ${identifier}, reason: ${reason}`);
    try {
      if (this.auditService) {
        await this.auditService.log({
          actor_id: actorId,
          actor_phone: identifier,
          action: 'LOGIN_FAILED',
          entity_type: 'user',
          entity_id: actorId,
          details: { reason, timestamp: new Date().toISOString() },
        });
      }
    } catch (e: unknown) {
      this.logger.warn(`Failed to log login attempt: ${(e instanceof Error ? e.message : String(e))}`);
    }
  }
}