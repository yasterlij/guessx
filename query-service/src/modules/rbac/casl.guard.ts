import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createAbilityForUser, checkPermission } from './ability.factory';
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

    if (!user) throw new ForbiddenException('Authentication required');

    const ability = createAbilityForUser(user);
    const granted = checkPermission(ability, required.action, required.subject);

    try {
      await this.prisma.$queryRaw`
        INSERT INTO access_decisions (id, user_id, user_role, action, subject, granted, reason, ip_address, user_agent)
        VALUES (uuid_generate_v4(), ${user.id}::uuid, ${user.role}, ${required.action}, ${required.subject}, ${granted},
                ${granted ? 'Permission granted' : 'Permission denied'},
                ${request.ip || null}, ${request.headers['user-agent'] || null})
      `;
    } catch {}

    if (!granted) {
      throw new ForbiddenException(
        `Access denied: ${user.role} cannot ${required.action} on ${required.subject}`,
      );
    }

    return true;
  }
}
