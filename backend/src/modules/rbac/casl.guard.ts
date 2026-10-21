import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppAbility, createAbilityForUser, checkPermission } from './ability.factory';
import { AppAction, AppSubject, UserContext } from './rbac.constants';
import { PrismaService } from '../../prisma/prisma.service';

export const CHECK_ABILITY = 'check_ability';

export interface AbilityMetadata {
  action: AppAction;
  subject: AppSubject;
}

export const RequireAbility = (action: AppAction, subject: AppSubject) =>
  SetMetadata(CHECK_ABILITY, { action, subject });

@Injectable()
export class CaslGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AbilityMetadata>(CHECK_ABILITY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserContext;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    let overrides: any[] = [];
    try {
      overrides = await this.prisma.permissionOverride.findMany({
        where: {
          user_id: user.id,
          revoked_at: null,
          expires_at: { gt: new Date() },
        },
      });
    } catch {}

    const ability = createAbilityForUser(user, overrides);

    const granted = checkPermission(ability, required.action, required.subject);

    await this.logAccessDecision(user, required, granted, request);

    if (!granted) {
      throw new ForbiddenException(
        `Access denied: ${user.role} cannot ${required.action} on ${required.subject}`,
      );
    }

    return true;
  }

  private async logAccessDecision(
    user: UserContext,
    required: AbilityMetadata,
    granted: boolean,
    request: any,
  ): Promise<void> {
    try {
      await this.prisma.accessDecision.create({
        data: {
          user_id: user.id,
          user_role: user.role,
          action: required.action,
          subject: required.subject,
          granted,
          reason: granted ? 'Permission granted' : 'Permission denied',
          ip_address: request.ip || request.headers['x-forwarded-for'] || null,
          user_agent: request.headers['user-agent'] || null,
        },
      });
    } catch {}
  }
}