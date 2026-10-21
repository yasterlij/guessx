import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const CURRENT_TC_VERSION = '1.0';

@Injectable()
export class TcService {
  constructor(private prisma: PrismaService) {}

  getCurrentTcVersion(): string {
    return CURRENT_TC_VERSION;
  }

  async acceptTc(
    userId: string,
    version: string,
  ): Promise<{ accepted: boolean; accepted_at: string; version: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tc_accepted: true,
        tc_accepted_at: now,
        tc_version: version,
      },
    });

    return {
      accepted: true,
      accepted_at: now.toISOString(),
      version,
    };
  }

  async hasAcceptedTc(
    userId: string,
  ): Promise<{ accepted: boolean; version: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tc_accepted: true, tc_version: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      accepted: user.tc_accepted,
      version: user.tc_version,
    };
  }
}
