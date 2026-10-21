import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async addFavorite(userId: string, auctionId: string): Promise<any> {
    const existing = await this.prisma.favorite.findFirst({
      where: { user_id: userId, auction_id: auctionId },
    });
    if (existing) return existing;

    return this.prisma.favorite.create({
      data: {
        user_id: userId,
        auction_id: auctionId,
      },
    });
  }

  async removeFavorite(userId: string, auctionId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({
      where: {
        user_id: userId,
        auction_id: auctionId,
      },
    });
  }

  async getUserFavorites(userId: string, page = 1, limit = 100): Promise<{ data: any[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { user_id: userId },
        include: {
          auction: {
            include: {
              product: true,
              winners: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.favorite.count({
        where: { user_id: userId },
      }),
    ]);
    return { data, total };
  }

  async isFavorite(userId: string, auctionId: string): Promise<boolean> {
    const count = await this.prisma.favorite.count({
      where: { user_id: userId, auction_id: auctionId },
    });
    return count > 0;
  }
}
