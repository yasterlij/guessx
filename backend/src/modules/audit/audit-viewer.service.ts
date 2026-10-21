import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogFilters {
  actor_id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  start_date?: Date;
  end_date?: Date;
}

export interface AuditLogListResult {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

@Injectable()
export class AuditViewerService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(filters: AuditLogFilters) {
    const where: any = {};
    if (filters.actor_id) where.actor_id = filters.actor_id;
    if (filters.action) where.action = filters.action;
    if (filters.entity_type) where.entity_type = filters.entity_type;
    if (filters.entity_id) where.entity_id = filters.entity_id;
    if (filters.start_date || filters.end_date) {
      where.created_at = {};
      if (filters.start_date) where.created_at.gte = filters.start_date;
      if (filters.end_date) where.created_at.lte = filters.end_date;
    }
    return where;
  }

  async listAuditLogs(
    filters: AuditLogFilters,
    page = 1,
    limit = 50,
  ): Promise<AuditLogListResult> {
    const where = this.buildWhere(filters);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async getAuditStats() {
    const [totalLogs, logsByAction, logsByActor, recentLogs] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      }),
      this.prisma.$queryRawUnsafe(
        `SELECT a.actor_id,
                a.actor_phone,
                COUNT(*)::int AS log_count
         FROM "AuditLog" a
         GROUP BY a.actor_id, a.actor_phone
         ORDER BY log_count DESC
         LIMIT 10`,
      ),
      this.prisma.auditLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
    ]);

    return {
      total_logs: totalLogs,
      logs_by_action: logsByAction,
      logs_by_actor: logsByActor,
      recent_logs: recentLogs,
    };
  }

  async exportAuditLogsCsv(filters: AuditLogFilters): Promise<string> {
    const where = this.buildWhere(filters);
    const CHUNK = 500;
    const chunks: string[] = [
      'id,actor_id,actor_phone,action,entity_type,entity_id,created_at,details',
    ];

    let cursor: string | undefined;
    while (true) {
      const batch = await this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: CHUNK,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
      });

      for (const log of batch) {
        chunks.push(
          [
            log.id,
            log.actor_id,
            this.csvEscape(log.actor_phone || ''),
            this.csvEscape(log.action),
            this.csvEscape(log.entity_type),
            log.entity_id,
            log.created_at.toISOString(),
            this.csvEscape(log.details ? JSON.stringify(log.details) : ''),
          ].join(','),
        );
      }

      if (batch.length < CHUNK) break;
      cursor = batch[batch.length - 1].id;
    }

    return chunks.join('\n');
  }

  private csvEscape(value: string): string {
    if (!value) return '';
    let str = value;
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
