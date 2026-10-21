import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { Transaction, TransactionType } from "./entities/transaction.entity";
import { User } from "../auth/entities/user.entity";

export interface WalletTransactionDto {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  reference_id: string | null;
  created_at: Date;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  async deposit(
    userId: string,
    amount: number,
    referenceId: string,
  ): Promise<{ id: string; wallet_balance: string | number | unknown }> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.transaction.findFirst({
        where: { reference_id: referenceId },
      });
      if (existing) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new NotFoundException("User not found");
        }
        return user;
      }

      const rows = await tx.$queryRaw<Array<{ id: string; wallet_balance: string }>>`
        UPDATE users
        SET wallet_balance = wallet_balance + ${amount}
        WHERE id = ${userId}
        RETURNING id, wallet_balance
      `;

      if (!rows?.length) {
        throw new NotFoundException("User not found");
      }

      await tx.transaction.create({
        data: {
          user_id: userId,
          amount,
          type: TransactionType.DEPOSIT,
          reference_id: referenceId,
        },
      });

      return rows[0];
    });
  }

  async deductBidFee(userId: string, feeAmount: number): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rows = await tx.$queryRaw<Array<{ id: string; wallet_balance: string }>>`
        UPDATE users
        SET wallet_balance = wallet_balance - ${feeAmount}
        WHERE id = ${userId} AND wallet_balance >= ${feeAmount}
        RETURNING id, wallet_balance
      `;

      if (!rows?.length) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new NotFoundException("User not found");
        }
        throw new BadRequestException("Insufficient wallet balance");
      }

      await tx.transaction.create({
        data: {
          user_id: userId,
          amount: feeAmount,
          type: TransactionType.BID_FEE,
          reference_id: null,
        },
      });
    });
  }

  async refund(
    userId: string,
    amount: number,
    referenceId: string,
  ): Promise<{ id: string; wallet_balance: string | number | unknown }> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.transaction.findFirst({
        where: { reference_id: referenceId },
      });
      if (existing) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new NotFoundException("User not found");
        }
        return user;
      }

      const rows = await tx.$queryRaw<Array<{ id: string; wallet_balance: string }>>`
        UPDATE users
        SET wallet_balance = wallet_balance + ${amount}
        WHERE id = ${userId}
        RETURNING id, wallet_balance
      `;

      if (!rows?.length) {
        throw new NotFoundException("User not found");
      }

      await tx.transaction.create({
        data: {
          user_id: userId,
          amount,
          type: TransactionType.REFUND,
          reference_id: referenceId,
        },
      });

      return rows[0];
    });
  }

  async getBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { wallet_balance: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return Number(user.wallet_balance);
  }

  async getTransactions(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: WalletTransactionDto[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { user_id: userId } }),
    ]);
    return { data: data as unknown as WalletTransactionDto[], total };
  }

  async resolveUser(id: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, full_name: true, phone_number: true },
    });
  }

  async handleFintechWebhook(payload: {
    reference_id: string;
    user_id: string;
    amount: number;
    status: string;
  }): Promise<void> {
    if (payload.status !== "COMPLETED") {
      return;
    }

    const existing = await this.prisma.transaction.findFirst({
      where: { reference_id: payload.reference_id },
    });
    if (existing) {
      return;
    }

    await this.deposit(payload.user_id, payload.amount, payload.reference_id);
  }
}
