import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisCacheService } from '../common/redis-cache.service';

export interface SettlementConfigDto {
  winning_price?: number;
  bid_fees_collected?: number;
  platform_share?: number;
  platform_share_percent?: number;
  tax?: number;
  tax_percent?: number;
  commission?: number;
  commission_percent?: number;
  net_to_seller?: number;
  is_custom_configured?: boolean;
  configured_by?: string;
  configured_at?: string;
}

@Injectable()
export class SettlementConfigService {
  private readonly logger = new Logger(SettlementConfigService.name);
  private readonly SETTLEMENT_CACHE_TTL_SECONDS = 86400;

  constructor(
    private prisma: PrismaService,
    private redisCacheService: RedisCacheService,
  ) {}

  async getAuctionSettlementConfig(auctionId: string): Promise<SettlementConfigDto | null> {
    const cacheKey = `settlement:auction:${auctionId}`;
    const cached = await this.redisCacheService.get<any>(cacheKey);
    if (cached) {
      if (cached.reset) return null;
      return cached as SettlementConfigDto;
    }

    try {
      const log = await this.prisma.auditLog.findFirst({
        where: {
          entity_id: auctionId,
          action: { in: ['SETTLEMENT_CONFIG_UPDATED', 'SETTLEMENT_CONFIG_RESET'] },
        },
        orderBy: { created_at: 'desc' },
      });
      if (log?.action === 'SETTLEMENT_CONFIG_RESET') {
        await this.redisCacheService.set(cacheKey, { reset: true }, this.SETTLEMENT_CACHE_TTL_SECONDS);
        return null;
      }
      if (log?.details) {
        await this.redisCacheService.set(cacheKey, log.details, this.SETTLEMENT_CACHE_TTL_SECONDS);
        return log.details as SettlementConfigDto;
      }
    } catch (e: unknown) {
      this.logger.warn(
        `Failed to retrieve audit log settlement config: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return null;
  }

  async saveAuctionSettlementConfig(
    auctionId: string,
    dto: Omit<SettlementConfigDto, 'is_custom_configured' | 'configured_by' | 'configured_at'>,
    actorId?: string,
  ): Promise<SettlementConfigDto> {
    const configData: SettlementConfigDto = {
      ...dto,
      is_custom_configured: true,
      configured_by: actorId || 'admin',
      configured_at: new Date().toISOString(),
    };

    const cacheKey = `settlement:auction:${auctionId}`;
    await this.redisCacheService.set(cacheKey, configData, this.SETTLEMENT_CACHE_TTL_SECONDS);

    try {
      await this.prisma.auditLog.create({
        data: {
          actor_id: actorId || 'admin',
          action: 'SETTLEMENT_CONFIG_UPDATED',
          entity_type: 'AUCTION',
          entity_id: auctionId,
          details: configData as object,
        },
      });
    } catch (e: unknown) {
      this.logger.warn(
        `Failed to create audit log for settlement config: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return configData;
  }

  async resetAuctionSettlementConfig(
    auctionId: string,
    actorId?: string,
  ): Promise<{ success: boolean }> {
    const cacheKey = `settlement:auction:${auctionId}`;
    await this.redisCacheService.set(
      cacheKey,
      { reset: true },
      this.SETTLEMENT_CACHE_TTL_SECONDS,
    );

    try {
      await this.prisma.auditLog.create({
        data: {
          actor_id: actorId || 'admin',
          action: 'SETTLEMENT_CONFIG_RESET',
          entity_type: 'AUCTION',
          entity_id: auctionId,
          details: { reset: true, reset_at: new Date().toISOString() },
        },
      });
    } catch (e: unknown) {
      this.logger.warn(
        `Failed to create audit log for settlement reset: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return { success: true };
  }
}
