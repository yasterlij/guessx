import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AuditLogEntry {
  actor_id: string;
  actor_phone?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<any> {
    return this.prisma.auditLog.create({ data: entry });
  }

  async logBatch(entries: AuditLogEntry[]): Promise<any[]> {
    return this.prisma.$transaction(
      entries.map((entry) => this.prisma.auditLog.create({ data: entry })),
    );
  }

  async list(
    page = 1,
    limit = 50,
    filters?: {
      actor_id?: string;
      action?: string;
      entity_type?: string;
      entity_id?: string;
      start_date?: Date;
      end_date?: Date;
    },
  ): Promise<{ data: any[]; meta: { total: number; page: number; limit: number; total_pages: number } }> {
    const where: any = {};
    if (filters?.actor_id) where.actor_id = filters.actor_id;
    if (filters?.action) where.action = filters.action;
    if (filters?.entity_type) where.entity_type = filters.entity_type;
    if (filters?.entity_id) where.entity_id = filters.entity_id;
    if (filters?.start_date || filters?.end_date) {
      where.created_at = {};
      if (filters?.start_date) where.created_at.gte = filters.start_date;
      if (filters?.end_date) where.created_at.lte = filters.end_date;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }
}
