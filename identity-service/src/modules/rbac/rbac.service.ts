import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createAbilityForUser, AppAbility } from './ability.factory';
import { AppAction, AppSubject, UserContext } from './rbac.constants';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  async getUserAbilities(user: UserContext): Promise<{
    role: string;
    abilities: Array<{ action: string; subject: string }>;
    overrides?: any[];
  }> {
    const overrides = await this.getActiveOverrides(user.id);
    const ability = createAbilityForUser(user, overrides);
    const rules = (ability as any).rules || [];

    return {
      role: user.role,
      abilities: rules.map((r: any) => ({
        action: r.action,
        subject: typeof r.subject === 'string' ? r.subject : r.subject?.value || 'all',
      })),
      overrides: overrides.map((o: any) => ({
        id: o.id,
        permissions: o.permissions,
        expires_at: o.expires_at,
        reason: o.reason,
      })),
    };
  }

  async checkAccess(
    user: UserContext,
    action: AppAction,
    subject: AppSubject,
  ): Promise<boolean> {
    const overrides = await this.getActiveOverrides(user.id);
    const ability = createAbilityForUser(user, overrides);
    return ability.can(action, subject);
  }

  async grantTemporaryAccess(
    userId: string,
    permissions: Record<string, string[]>,
    grantedBy: string,
    reason: string,
    expiresAt: Date,
  ) {
    if (expiresAt <= new Date()) {
      throw new BadRequestException('Expiry must be in the future');
    }

    return this.prisma.permissionOverride.create({
      data: {
        user_id: userId,
        granted_by: grantedBy,
        permissions,
        reason,
        expires_at: expiresAt,
        is_active: true,
      },
    });
  }

  async revokeOverride(overrideId: string, revokedBy: string) {
    const override = await this.prisma.permissionOverride.findUnique({
      where: { id: overrideId },
    });
    if (!override) throw new NotFoundException('Override not found');

    return this.prisma.permissionOverride.update({
      where: { id: overrideId },
      data: {
        is_active: false,
        revoked_at: new Date(),
        revoked_by: revokedBy,
      },
    });
  }

  async getActiveOverrides(userId: string) {
    return this.prisma.permissionOverride.findMany({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async listOverrides(filters?: { userId?: string; activeOnly?: boolean }) {
    const where: any = {};
    if (filters?.userId) where.user_id = filters.userId;
    if (filters?.activeOnly) {
      where.is_active = true;
      where.expires_at = { gt: new Date() };
    }
    return this.prisma.permissionOverride.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async getAccessDecisions(
    userId?: string,
    page = 1,
    limit = 50,
  ) {
    const where: any = {};
    if (userId) where.user_id = userId;

    const [data, total] = await Promise.all([
      this.prisma.accessDecision.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.accessDecision.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  async cleanupExpiredOverrides(): Promise<number> {
    const result = await this.prisma.permissionOverride.updateMany({
      where: {
        is_active: true,
        expires_at: { lt: new Date() },
      },
      data: { is_active: false },
    });
    return result.count;
  }
}