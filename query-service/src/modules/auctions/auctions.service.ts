import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { ListAuctionsQueryDto } from "../common/dto/list-auctions-query.dto";
import { normalizeProductCategory } from "./product-categories";
import { AuditService } from "../common/audit/audit.service";
import { RedisCacheService } from "../common/redis-cache.service";

interface WinnerRow {
  user_id: string;
  amount: number;
  rank: number;
  payment_status: string;
  payment_deadline: Date;
  user_name: string | null;
  phone: string | null;
}

function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return '****';
  return `${cleaned.slice(0, 4)}****${cleaned.slice(-2)}`;
}

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(AuctionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private bidEncryptionService: BidEncryptionService,
    private readonly auditService: AuditService,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  private isRecoverableSchemaError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes("does not exist") ||
      message.includes("public_code") ||
      message.includes("category") ||
      message.includes("specs") ||
      message.includes("bid_fee") ||
      message.includes("current_market_price") ||
      message.includes("created_at")
    );
  }

  private async getExistingColumns(table: string): Promise<Set<string>> {
    const rows: Array<{ column_name: string }> = await this.prisma.$queryRawUnsafe(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1",
      table,
    );
    return new Set(rows.map((r) => r.column_name));
  }

  private async loadAuctionRows(
    statuses: string[],
    activeOnly = false,
  ): Promise<Array<Record<string, unknown>>> {
    const statusPlaceholders = statuses
      .map((_, index) => `$${index + 1}`)
      .join(", ");
    const params: Array<string | Date> = [...statuses];
    let where = `a.status IN (${statusPlaceholders})`;
    if (activeOnly) {
      params.push(new Date());
      where += ` AND a.end_time > $${params.length}`;
    }

    const auctionCols = await this.getExistingColumns("auctions");
    const productCols = await this.getExistingColumns("products");

    if (auctionCols.size === 0) {
      return [];
    }

    const hasProductsTable = productCols.size > 0;
    const rankedOrder = auctionCols.has("created_at")
      ? "created_at ASC"
      : "start_time ASC, id ASC";
    const finalOrder = auctionCols.has("created_at")
      ? "a.created_at DESC"
      : "a.start_time DESC";

    const auctionSelect = [
      "a.id",
      "ranked.public_code",
      "a.product_id",
      "a.start_time",
      "a.end_time",
      "a.status",
      ...(auctionCols.has("bid_fee") ? ["a.bid_fee"] : []),
      ...(auctionCols.has("winner_user_id") ? ["a.winner_user_id"] : []),
      ...(auctionCols.has("winning_bid_amount")
        ? ["a.winning_bid_amount"]
        : []),
      ...(auctionCols.has("payment_status") ? ["a.payment_status"] : []),
      ...(auctionCols.has("payment_deadline") ? ["a.payment_deadline"] : []),
      ...(auctionCols.has("second_winner_assigned") ? ["a.second_winner_assigned"] : []),
      ...(auctionCols.has("payment_deadline_hours") ? ["a.payment_deadline_hours"] : []),
      ...(auctionCols.has("escalation_rule") ? ["a.escalation_rule"] : []),
      ...(auctionCols.has("created_at") ? ["a.created_at"] : []),
    ].join(",\n        ");

    const productSelect = hasProductsTable
      ? [
          "p.id AS product_ref_id",
          "p.name AS product_name",
          "p.description AS product_description",
          "p.image_urls AS product_image_urls",
          ...(productCols.has("current_market_price")
            ? ["p.current_market_price AS product_current_market_price"]
            : ["NULL::numeric AS product_current_market_price"]),
          ...(productCols.has("category")
            ? ["p.category AS product_category"]
            : ["NULL::text AS product_category"]),
          ...(productCols.has("brand")
            ? ["p.brand AS product_brand"]
            : ["NULL::text AS product_brand"]),
        ].join(",\n        ")
      : [
          "NULL::uuid AS product_ref_id",
          "NULL::text AS product_name",
          "NULL::text AS product_description",
          "NULL::text[] AS product_image_urls",
          "NULL::numeric AS product_current_market_price",
          "NULL::text AS product_category",
          "NULL::text AS product_brand",
        ].join(",\n        ");

    return this.prisma.$queryRawUnsafe(
      `WITH ranked AS (
        SELECT id, LPAD(ROW_NUMBER() OVER (ORDER BY ${rankedOrder})::text, 5, '0') AS public_code
        FROM auctions
      )
      SELECT
        ${auctionSelect},
        ${productSelect}
      FROM auctions a
      LEFT JOIN ranked ON ranked.id = a.id
      ${hasProductsTable ? "LEFT JOIN products p ON p.id = a.product_id" : ""}
      WHERE ${where}
      ORDER BY ${finalOrder}
      LIMIT 200`,
      ...params,
    );
  }

  private toAuctionRecord(row: Record<string, unknown>) {
    const productId = row.product_ref_id || row.product_id;
    return {
      id: row.id,
      public_code: row.public_code ? String(row.public_code) : undefined,
      product_id: productId,
      product: productId
        ? {
            id: productId,
            name: row.product_name,
            description: row.product_description,
            image_urls: row.product_image_urls,
            current_market_price: Number(row.product_current_market_price || 0),
            category: normalizeProductCategory(
              row.product_category as string | null | undefined,
              row.product_name as string | null | undefined,
              row.product_brand as string | null | undefined,
            ),
            brand: row.product_brand,
            specs: null,
          }
        : null,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status,
      bid_fee: row.bid_fee != null ? Number(row.bid_fee) : null,
      winner_user_id: row.winner_user_id,
      winning_bid_amount: row.winning_bid_amount,
      payment_status: row.payment_status,
      payment_deadline: row.payment_deadline,
      payment_deadline_hours: row.payment_deadline_hours != null ? Number(row.payment_deadline_hours) : null,
      escalation_rule: row.escalation_rule || null,
      second_winner_assigned: Boolean(row.second_winner_assigned),
      created_at: row.created_at,
    };
  }

  async getActiveAuctions(query?: ListAuctionsQueryDto): Promise<any[]> {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(200, Math.max(1, query?.limit ?? 50));
    const skip = (page - 1) * limit;
    const cacheKey = `auctions:active:p${page}:l${limit}`;
    const cached = await this.redisCacheService.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    let auctions: Array<Record<string, unknown>> = [];
    try {
      auctions = await this.prisma.auction.findMany({
        where: { status: "ACTIVE", end_time: { gt: new Date() } },
        select: {
          id: true,
          public_code: true,
          product_id: true,
          start_time: true,
          end_time: true,
          status: true,
          bid_fee: true,
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              image_urls: true,
              current_market_price: true,
              category: true,
              brand: true,
              specs: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      });
    } catch (error) {
      if (!this.isRecoverableSchemaError(error)) throw error;
      const rows = await this.loadAuctionRows(["ACTIVE"], true);
      auctions = rows.map((row) => this.toAuctionRecord(row));
    }

    if (auctions.length === 0) return [];

    const auctionIds = auctions.map((a) => a.id);

    let bidCountMap = new Map<string, number>();
    let uniqueBidderMap = new Map<string, number>();
    try {
      const [bidCounts, uniqueBidderRows] = await Promise.all([
        this.prisma.$queryRawUnsafe(
          `SELECT auction_id, COUNT(*)::text AS count
           FROM bids
           WHERE auction_id = ANY($1)
           GROUP BY auction_id`,
          auctionIds,
        ),
        this.prisma.$queryRawUnsafe(
          `SELECT auction_id, COUNT(DISTINCT user_id)::text AS count
           FROM bids
           WHERE auction_id = ANY($1)
           GROUP BY auction_id`,
          auctionIds,
        ),
      ]);

      bidCountMap = new Map(
        (bidCounts as any[]).map((r: any) => [r.auction_id, parseInt(r.count, 10)]),
      );
      uniqueBidderMap = new Map(
        (uniqueBidderRows as any[]).map((r: any) => [r.auction_id, parseInt(r.count, 10)]),
      );
    } catch (error) {
      if (!this.isRecoverableSchemaError(error)) throw error;
    }

    const result = auctions.map((auction) => ({
      id: auction.id,
      public_code: auction.public_code,
      product_id: auction.product_id,
      product: auction.product || null,
      start_time: auction.start_time,
      end_time: auction.end_time,
      bid_fee: auction.bid_fee != null ? Number(auction.bid_fee) : null,
      time_remaining: this.computeTimeRemaining(auction.end_time as Date),
      stats: {
        total_bids: bidCountMap.get(auction.id as string) || 0,
        unique_bidders: uniqueBidderMap.get(auction.id as string) || 0,
      },
      status: auction.status,
    }));

    await this.redisCacheService.set(cacheKey, result, 5);
    return result;
  }

  async getActiveAuction(auctionId: string, userId?: string): Promise<any> {
    let auction: any = null;
    try {
      auction = await this.prisma.auction.findFirst({
        where: { id: auctionId },
        select: {
          id: true,
          public_code: true,
          product_id: true,
          start_time: true,
          end_time: true,
          status: true,
          bid_fee: true,
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              image_urls: true,
              current_market_price: true,
              category: true,
              brand: true,
              specs: true,
            },
          },
        },
      });
    } catch (error) {
      if (!this.isRecoverableSchemaError(error)) throw error;
      const auctionCols = await this.getExistingColumns("auctions");
      const productCols = await this.getExistingColumns("products");
      const auctionSelect = [
        "a.id",
        "ranked.public_code",
        "a.product_id",
        "a.start_time",
        "a.end_time",
        "a.status",
        ...(auctionCols.has("bid_fee") ? ["a.bid_fee"] : []),
        ...(auctionCols.has("winner_user_id") ? ["a.winner_user_id"] : []),
        ...(auctionCols.has("winning_bid_amount")
          ? ["a.winning_bid_amount"]
          : []),
        ...(auctionCols.has("payment_status") ? ["a.payment_status"] : []),
        ...(auctionCols.has("payment_deadline") ? ["a.payment_deadline"] : []),
        ...(auctionCols.has("second_winner_assigned") ? ["a.second_winner_assigned"] : []),
        ...(auctionCols.has("payment_deadline_hours") ? ["a.payment_deadline_hours"] : []),
        ...(auctionCols.has("escalation_rule") ? ["a.escalation_rule"] : []),
        ...(auctionCols.has("created_at") ? ["a.created_at"] : []),
      ].join(",\n          ");
      const productSelect = [
        "p.id AS product_ref_id",
        "p.name AS product_name",
        "p.description AS product_description",
        "p.image_urls AS product_image_urls",
        "p.current_market_price AS product_current_market_price",
        ...(productCols.has("category")
          ? ["p.category AS product_category"]
          : ["NULL::text AS product_category"]),
        ...(productCols.has("brand") ? ["p.brand AS product_brand"] : []),
      ].join(",\n          ");
      const rows = await this.prisma.$queryRawUnsafe(
        `WITH ranked AS (
          SELECT id, LPAD(ROW_NUMBER() OVER (ORDER BY created_at ASC)::text, 5, '0') AS public_code
          FROM auctions
        )
        SELECT
          ${auctionSelect},
          ${productSelect}
        FROM auctions a
        LEFT JOIN ranked ON ranked.id = a.id
        LEFT JOIN products p ON p.id = a.product_id
        WHERE a.id = $1
        LIMIT 1`,
        auctionId,
      );
      auction = (rows as any[])[0] ? this.toAuctionRecord((rows as any[])[0]) : null;
    }

    if (
      !auction ||
      auction.status !== "ACTIVE" ||
      auction.end_time.getTime() <= Date.now()
    ) {
      throw new NotFoundException("Auction not found or has ended");
    }

    const now = Date.now();
    const timeRemaining = Math.max(0, auction.end_time.getTime() - now);

    const [totalBids, uniqueBiddersRows] = await Promise.all([
      this.prisma.bid.count({
        where: { auction_id: auctionId },
      }),
      this.prisma.$queryRawUnsafe(
        `SELECT COUNT(DISTINCT user_id)::text AS count
         FROM bids
         WHERE auction_id = $1`,
        auctionId,
      ),
    ]);
    const uniqueBidders = (uniqueBiddersRows as any[])[0];

    const result = {
      id: auction.id,
      public_code: auction.public_code,
      product: (auction as any).product || null,
      bid_fee: auction.bid_fee != null ? Number(auction.bid_fee) : null,
      time_remaining: {
        days: Math.floor(timeRemaining / 86400000),
        hours: Math.floor((timeRemaining % 86400000) / 3600000),
        minutes: Math.floor((timeRemaining % 3600000) / 60000),
        seconds: Math.floor((timeRemaining % 60000) / 1000),
      },
      stats: {
        total_bids: totalBids,
        unique_bidders: parseInt(uniqueBidders?.count || "0", 10),
      },
      status: auction.status,
    };

    // Audit log: auction viewed
    if (userId) {
      this.auditService.log({
        actor_id: userId,
        action: 'auction_viewed',
        entity_type: 'auction',
        entity_id: auctionId,
        details: { status: auction.status },
      }).catch((e: any) =>
        console.warn(`Failed to log auction view audit: ${e.message}`),
      );
    }

    return result;
  }

  async getClosedAuctions(query?: ListAuctionsQueryDto): Promise<any[]> {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(200, Math.max(1, query?.limit ?? 50));
    const skip = (page - 1) * limit;
    const cacheKey = `auctions:closed:p${page}:l${limit}`;
    const cached = await this.redisCacheService.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    let auctions: Array<Record<string, unknown>> = [];
    try {
      auctions = await this.prisma.auction.findMany({
        where: {
          status: { in: ["CLOSED", "EXPIRED"] },
        },
        select: {
          id: true,
          public_code: true,
          product_id: true,
          start_time: true,
          end_time: true,
          status: true,
          bid_fee: true,
          winner_user_id: true,
          winning_bid_amount: true,
          created_at: true,
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              image_urls: true,
              current_market_price: true,
              category: true,
              brand: true,
              specs: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      });
    } catch (error) {
      if (!this.isRecoverableSchemaError(error)) throw error;
      const rows = await this.loadAuctionRows([
        "CLOSED",
        "EXPIRED",
      ]);
      auctions = rows.map((row) => this.toAuctionRecord(row));
    }

    const auctionIds = auctions.map((a) => a.id);

    let winnersByAuction: Map<string, WinnerRow[]> = new Map();
    let bidCountMap = new Map<string, number>();

    if (auctionIds.length > 0) {
      try {
        const [winnerRows, bidCountRows] = await Promise.all([
          this.prisma.$queryRawUnsafe(
            `SELECT w.auction_id, w.user_id, w.amount, w.rank, w.payment_status, w.payment_deadline, u.full_name AS user_name, u.phone_number AS phone
              FROM winners w
              LEFT JOIN users u ON u.id = w.user_id
              WHERE w.auction_id = ANY($1)
              ORDER BY w.rank ASC`,
            auctionIds,
          ),
          this.prisma.$queryRawUnsafe(
            `SELECT auction_id, COUNT(*)::text AS count
             FROM bids
             WHERE auction_id = ANY($1)
             GROUP BY auction_id`,
            auctionIds,
          ),
        ]);

        for (const row of winnerRows as any[]) {
          if (!winnersByAuction.has(row.auction_id)) {
            winnersByAuction.set(row.auction_id, []);
          }
          winnersByAuction.get(row.auction_id)!.push({
            user_id: row.user_id,
            amount: parseFloat(row.amount),
            rank: row.rank,
            payment_status: row.payment_status,
            payment_deadline: row.payment_deadline,
            user_name: row.user_name || null,
            phone: maskPhone(row.phone),
          });
        }

        bidCountMap = new Map(
          (bidCountRows as any[]).map((r: any) => [r.auction_id, parseInt(r.count, 10)]),
        );
      } catch {
        // winners/bids tables may not exist in query service's read replica; ignore
      }
    }

    if (auctions.length === 0) return [];

    const result = auctions.map((auction) => {
      const auctionWinners = winnersByAuction.get(auction.id as string) || [];
      return {
        id: auction.id,
        public_code: auction.public_code,
        product_id: auction.product_id,
        product: auction.product || null,
        start_time: auction.start_time,
        end_time: auction.end_time,
        bid_fee: auction.bid_fee != null ? Number(auction.bid_fee) : null,
        status: auction.status,
        winner_user_id: auction.winner_user_id,
        winning_bid_amount: auction.winning_bid_amount,
        winners: auctionWinners.map((w) => ({
          user_id: w.user_id,
          user_name: w.user_name,
          phone: w.phone,
          amount: w.amount,
          rank: w.rank,
          payment_status: w.payment_status,
          payment_deadline: w.payment_deadline,
        })),
        winners_count: auctionWinners.length,
        stats: { total_bids: bidCountMap.get(auction.id as string) || 0 },
        created_at: auction.created_at,
      };
    });

    await this.redisCacheService.set(cacheKey, result, 30);
    return result;
  }

  async getBidHistory(auctionId: string, userId?: string): Promise<any[]> {
    const auction = await this.prisma.auction.findFirst({
      where: { id: auctionId },
      select: { id: true, status: true },
    });
    const isActive = auction?.status === "ACTIVE";
    const bids = await this.prisma.bid.findMany({
      where: { auction_id: auctionId },
      select: {
        id: true,
        user_id: true,
        auction_id: true,
        amount: true,
        encrypted_amount: true,
        bid_time: true,
        service_fee_paid: true,
        ticket_number: true,
      },
      orderBy: { bid_time: "desc" },
      take: 500,
    });

    // Audit log: bid history viewed
    if (userId) {
      this.auditService.log({
        actor_id: userId,
        action: 'bid_history_viewed',
        entity_type: 'auction',
        entity_id: auctionId,
        details: { is_active: isActive },
      }).catch((e: any) =>
        console.warn(`Failed to log bid history view audit: ${e.message}`),
      );
    }

    return Promise.all(
      bids.map(async (b) => {
        let realAmount = Number(b.amount);
        if (!isActive && b.encrypted_amount) {
          try {
            realAmount = this.bidEncryptionService.decrypt(b.encrypted_amount);
          } catch {
            realAmount = 0;
          }
        }
        return {
          id: b.id,
          user_id: b.user_id,
          auction_id: b.auction_id,
          amount: isActive ? 0 : realAmount,
          encrypted_amount: isActive ? b.encrypted_amount : null,
          amount_encrypted: isActive,
          bid_time: b.bid_time,
          service_fee_paid: b.service_fee_paid,
          ticket_number: b.ticket_number,
        };
      }),
    );
  }

  async getUserBidHistory(userId: string, actorId?: string): Promise<any[]> {
    const bids = await this.prisma.bid.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        user_id: true,
        auction_id: true,
        amount: true,
        encrypted_amount: true,
        bid_time: true,
        service_fee_paid: true,
        ticket_number: true,
      },
      orderBy: { bid_time: "desc" },
      take: 100,
    });

    // Audit log: user bid history viewed
    if (actorId && actorId !== userId) {
      this.auditService.log({
        actor_id: actorId,
        action: 'user_bid_history_viewed',
        entity_type: 'user',
        entity_id: userId,
        details: { bid_count: bids.length },
      }).catch((e: any) =>
        console.warn(`Failed to log user bid history view audit: ${e.message}`),
      );
    }

    if (bids.length === 0) return [];

    const auctionIds = [...new Set(bids.map((b) => b.auction_id))];
    const auctions = await this.prisma.auction.findMany({
      where: { id: { in: auctionIds } },
      select: { id: true, status: true },
    });
    const auctionStatusMap = new Map(auctions.map((a) => [a.id, a.status]));

    return Promise.all(
      bids.map(async (b) => {
        const isActive =
          auctionStatusMap.get(b.auction_id) === "ACTIVE";
        let realAmount = Number(b.amount);
        if (!isActive && b.encrypted_amount) {
          try {
            realAmount = this.bidEncryptionService.decrypt(b.encrypted_amount);
          } catch {
            realAmount = 0;
          }
        }
        return {
          id: b.id,
          user_id: b.user_id,
          auction_id: b.auction_id,
          amount: isActive ? 0 : realAmount,
          encrypted_amount: isActive ? b.encrypted_amount : null,
          amount_encrypted: isActive,
          bid_time: b.bid_time,
          service_fee_paid: b.service_fee_paid,
          ticket_number: b.ticket_number,
        };
      }),
    );
  }

  async getUserWonAuctions(userId: string, actorId?: string): Promise<any[]> {
    // Audit log: user won auctions viewed
    if (actorId && actorId !== userId) {
      this.auditService.log({
        actor_id: actorId,
        action: 'user_won_auctions_viewed',
        entity_type: 'user',
        entity_id: userId,
        details: {},
      }).catch((e: any) =>
        console.warn(`Failed to log user won auctions view audit: ${e.message}`),
      );
    }

    let auctions: any[];
    try {
      auctions = await this.prisma.auction.findMany({
        where: {
          winner_user_id: userId,
          status: "CLOSED",
        },
        select: {
          id: true,
          product_id: true,
          start_time: true,
          end_time: true,
          status: true,
          bid_fee: true,
          winner_user_id: true,
          winning_bid_amount: true,
          created_at: true,
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              image_urls: true,
              current_market_price: true,
              category: true,
              brand: true,
              specs: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 100,
      });
    } catch (error) {
      if (!this.isRecoverableSchemaError(error)) throw error;
      auctions = (await this.loadAuctionRows(["CLOSED"])).filter(
        (a) => a.winner_user_id === userId,
      );
    }

    const auctionIds = auctions.map((a) => a.id);
    let winnersByAuction: Map<string, WinnerRow[]> = new Map();
    if (auctionIds.length > 0) {
      try {
        const winnerRows: any[] = await this.prisma.$queryRawUnsafe(
          `SELECT w.auction_id, w.user_id, w.amount, w.rank, w.payment_status, w.payment_deadline, u.full_name AS user_name, u.phone_number AS phone
           FROM winners w
           LEFT JOIN users u ON u.id = w.user_id
           WHERE w.auction_id = ANY($1) AND w.user_id = $2
           ORDER BY w.rank ASC`,
          auctionIds,
          userId,
        );
        for (const row of winnerRows) {
          if (!winnersByAuction.has(row.auction_id)) {
            winnersByAuction.set(row.auction_id, []);
          }
          winnersByAuction.get(row.auction_id)!.push({
            user_id: row.user_id,
            amount: parseFloat(row.amount),
            rank: row.rank,
            payment_status: row.payment_status,
            payment_deadline: row.payment_deadline,
            user_name: row.user_name || null,
            phone: row.phone || null,
          });
        }
      } catch (e: unknown) {
        this.logger.warn(
          `Failed to load winners for user ${userId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return auctions.map((auction) => {
      const auctionWinners = winnersByAuction.get(auction.id as string) || [];
      return {
        id: auction.id,
        product: auction.product,
        start_time: auction.start_time,
        end_time: auction.end_time,
        bid_fee: auction.bid_fee != null ? Number(auction.bid_fee) : null,
        status: auction.status,
        winner_user_id: auction.winner_user_id,
        winning_bid_amount: auction.winning_bid_amount,
        winners: auctionWinners,
        created_at: auction.created_at,
      };
    });
  }

  private computeTimeRemaining(endTime: Date) {
    const diff = Math.max(0, endTime.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  }
}
