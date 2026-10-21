import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ALL_PERMISSIONS, Permission } from './constants/permissions';
import { Redis } from 'ioredis';

@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  async listUsers(page: number, limit: number, search?: string) {
    const where: any = {};
    if (search) {
      where.phone_number = { contains: search };
    }
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, phone_number: true, email: true, full_name: true, wallet_balance: true, role: true, is_banned: true, phone_verified: true, created_at: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: users, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }

  async getUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, phone_number: true, email: true, full_name: true, wallet_balance: true, role: true, is_banned: true, phone_verified: true, created_at: true },
    });
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, phone_number: true, email: true, full_name: true, wallet_balance: true, role: true, is_banned: true, phone_verified: true, created_at: true, avatar_url: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const transactions = await this.prisma.transaction.findMany({
      where: { user_id: id },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    let bids: any[] = [];
    let wonAuctions: any[] = [];
    try {
      bids = await this.prisma.$queryRaw`
        SELECT b.id, b.amount, b.bid_time, b.auction_id, a.status
        FROM bids b JOIN auctions a ON a.id = b.auction_id
        WHERE b.user_id = ${id}::uuid ORDER BY b.bid_time DESC LIMIT 50`;
      wonAuctions = await this.prisma.$queryRaw`
        SELECT a.id, a.status, a.winning_bid_amount, a.end_time, p.name AS product_name
        FROM auctions a JOIN products p ON p.id = a.product_id
        WHERE a.winner_user_id = ${id}::uuid ORDER BY a.end_time DESC LIMIT 20`;
    } catch {}

    const transactionSummary = {
      total_deposits: 0,
      total_bid_fees: 0,
      total_refunds: 0,
    };
    for (const t of transactions) {
      if (t.type === 'DEPOSIT') transactionSummary.total_deposits += Number(t.amount);
      if (t.type === 'BID_FEE') transactionSummary.total_bid_fees += Number(t.amount);
      if (t.type === 'REFUND') transactionSummary.total_refunds += Number(t.amount);
    }

    return { user, transactions, bids, won_auctions: wonAuctions, transaction_summary: transactionSummary };
  }

  async getUserTransactions(userId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { user_id: userId } }),
    ]);
    return { data, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }

  async listAllTransactions(page: number, limit: number, type?: string) {
    const where: any = {};
    if (type) where.type = type;
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { data, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }

  async updateRole(id: string, role: string, actor: { id: string; phone?: string }) {
    if (actor.id === id) {
      throw new BadRequestException('Administrators cannot modify their own role');
    }
    const validRoles = ['user', 'admin', 'CEO', 'CXO', 'DIRECTOR', 'MANAGER', 'EXPERT', 'SPECIALIST', 'ANALYST'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const oldRole = user.role;
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
    });
    await this.auditService.log({
      actor_id: actor.id,
      actor_phone: actor.phone,
      action: 'update_role',
      entity_type: 'user',
      entity_id: id,
      details: { from: oldRole, to: updated.role },
    });
    return { id, role: updated.role };
  }

  async toggleBan(id: string, isBanned: boolean, actor: { id: string; phone?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (isBanned) {
      await this.redis.sadd('guessx:banned-users', id);
    } else {
      await this.redis.srem('guessx:banned-users', id);
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        is_banned: isBanned,
        ...(isBanned ? { hashed_refresh_token: '' } : {}),
      },
    });
    await this.auditService.log({
      actor_id: actor.id,
      actor_phone: actor.phone,
      action: isBanned ? 'ban_user' : 'unban_user',
      entity_type: 'user',
      entity_id: id,
      details: { is_banned: isBanned },
    });
    return { id, is_banned: updated.is_banned };
  }

  async bulkUpdateRole(ids: string[], role: string, actor: { id: string; phone?: string }) {
    if (ids.includes(actor.id)) {
      throw new BadRequestException('Administrators cannot modify their own role');
    }
    const validRoles = ['user', 'admin', 'CEO', 'CXO', 'DIRECTOR', 'MANAGER', 'EXPERT', 'SPECIALIST', 'ANALYST'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }
    const newRole = role;
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } } });
    for (const u of users) {
      const old = u.role;
      await this.auditService.log({
        actor_id: actor.id, actor_phone: actor.phone,
        action: 'update_role',
        entity_type: 'user', entity_id: u.id,
        details: { from: old, to: newRole },
      });
    }
    await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { role: newRole },
    });
    return { updated: users.length, role: newRole };
  }

  async bulkToggleBan(ids: string[], isBanned: boolean, actor: { id: string; phone?: string }) {
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } } });
    for (const u of users) {
      if (isBanned) {
        await this.redis.sadd('guessx:banned-users', u.id);
      } else {
        await this.redis.srem('guessx:banned-users', u.id);
      }
      await this.auditService.log({
        actor_id: actor.id, actor_phone: actor.phone,
        action: isBanned ? 'ban_user' : 'unban_user',
        entity_type: 'user', entity_id: u.id,
        details: { is_banned: isBanned },
      });
    }
    await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: {
        is_banned: isBanned,
        ...(isBanned ? { hashed_refresh_token: '' } : {}),
      },
    });
    return { updated: users.length, is_banned: isBanned };
  }

  async exportUsersCsv(search?: string) {
    const where: any = {};
    if (search) where.phone_number = { contains: search };
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: { id: true, phone_number: true, email: true, full_name: true, wallet_balance: true, role: true, is_banned: true, phone_verified: true, created_at: true },
    });
    const header = 'id,phone_number,email,full_name,wallet_balance,role,is_banned,phone_verified,created_at';
    const rows = users.map((u) =>
      [u.id, u.phone_number, u.email, u.full_name, u.wallet_balance, u.role, u.is_banned, u.phone_verified, u.created_at].join(','),
    );
    return [header, ...rows].join('\n');
  }

  async exportTransactionsCsv(type?: string) {
    const where: any = {};
    if (type) where.type = type;
    const txns = await this.prisma.transaction.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
    const header = 'id,user_id,amount,type,reference_id,created_at';
    const rows = txns.map((t) =>
      [t.id, t.user_id, t.amount, t.type, t.reference_id || '', t.created_at].join(','),
    );
    return [header, ...rows].join('\n');
  }

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const permissions = await this.prisma.userPermission.findMany({
      where: { user_id: userId },
      include: { grantor: { select: { full_name: true } } },
      orderBy: { created_at: 'desc' },
    });

    return {
      user_id: userId,
      role: user.role,
      permissions: permissions.map((p) => ({
        id: p.id,
        permission: p.permission,
        granted_by: p.granted_by,
        granted_by_name: p.grantor?.full_name || null,
        created_at: p.created_at,
      })),
    };
  }

  async grantPermissions(
    userId: string,
    permissions: string[],
    actor: { id: string; phone?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const invalid = permissions.filter((p) => !ALL_PERMISSIONS.includes(p as Permission));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid permissions: ${invalid.join(', ')}`);
    }

    const existing = await this.prisma.userPermission.findMany({
      where: { user_id: userId, permission: { in: permissions } },
    });
    const existingSet = new Set(existing.map((p) => p.permission));
    const newPermissions = permissions.filter((p) => !existingSet.has(p));

    if (newPermissions.length === 0) {
      return { granted: [], message: 'All permissions already assigned' };
    }

    await this.prisma.userPermission.createMany({
      data: newPermissions.map((permission) => ({
        user_id: userId,
        permission,
        granted_by: actor.id,
      })),
    });

    await this.auditService.log({
      actor_id: actor.id,
      actor_phone: actor.phone,
      action: 'grant_permissions',
      entity_type: 'user',
      entity_id: userId,
      details: { granted: newPermissions },
    });

    return { granted: newPermissions };
  }

  async revokePermissions(
    userId: string,
    permissions: string[],
    actor: { id: string; phone?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const result = await this.prisma.userPermission.deleteMany({
      where: { user_id: userId, permission: { in: permissions } },
    });

    if (result.count > 0) {
      await this.auditService.log({
        actor_id: actor.id,
        actor_phone: actor.phone,
        action: 'revoke_permissions',
        entity_type: 'user',
        entity_id: userId,
        details: { revoked: permissions },
      });
    }

    return { revoked: result.count };
  }
}