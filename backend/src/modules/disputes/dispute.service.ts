import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DisputeService {
  constructor(private prisma: PrismaService) {}

  async createDispute(
    userId: string,
    auctionId: string | null,
    type: string,
    description: string,
    documentUrls?: string,
  ) {
    return this.prisma.dispute.create({
      data: {
        user_id: userId,
        auction_id: auctionId,
        type,
        description,
        document_urls: documentUrls,
        status: 'OPEN',
      },
    });
  }

  async listDisputes(userId: string) {
    return this.prisma.dispute.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getDispute(id: string, actor?: { id: string; role?: string }) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    if (actor && dispute.user_id !== actor.id && actor.role !== 'admin') {
      throw new ForbiddenException('You do not have permission to view this dispute');
    }
    return dispute;
  }

  async listAllDisputes(
    status: string | undefined,
    page: number,
    limit: number,
  ) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    const [data, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dispute.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  async updateDisputeStatus(
    id: string,
    status: string,
    resolution: string | undefined,
    adminId: string,
    documentUrls?: string,
  ) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const updateData: any = {
      status,
      resolution,
      resolved_by: adminId,
      updated_at: new Date(),
    };

    if (documentUrls !== undefined) {
      updateData.document_urls = documentUrls;
    }

    return this.prisma.dispute.update({
      where: { id },
      data: updateData,
    });
  }
}
