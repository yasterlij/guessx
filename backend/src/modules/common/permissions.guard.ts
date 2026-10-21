import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { Permission } from '../admin/constants/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Not authenticated');

    if (user.role === 'admin' || user.role === 'CEO') return true;

    const permissions = await this.prisma.userPermission.findMany({
      where: { user_id: user.id },
      select: { permission: true },
    });
    const userPermissions = new Set(permissions.map((p) => p.permission));

    const activeOverrides = await this.prisma.permissionOverride.findMany({
      where: {
        user_id: user.id,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      select: { permissions: true },
    });

    for (const ov of activeOverrides) {
      const perms = ov.permissions as any;
      if (Array.isArray(perms)) {
        perms.forEach((p) => userPermissions.add(String(p)));
      } else if (perms && typeof perms === 'object') {
        Object.values(perms).flat().forEach((p) => userPermissions.add(String(p)));
      }
    }

    const hasAll = requiredPermissions.every((p) => userPermissions.has(p));
    if (!hasAll) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}