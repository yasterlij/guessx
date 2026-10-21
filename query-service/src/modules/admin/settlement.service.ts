import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface SettlementReport {
  start_date: string;
  end_date: string;
  participation_fee_revenue: number;
  winning_price_total: number;
  platform_share: number;
  tax: number;
  commission: number;
  net_revenue: number;
  auction_count: number;
  transaction_count: number;
  escrow_summary?: {
    total_held_in_escrow: number;
    total_released_to_platform: number;
    pending_delivery_count: number;
  };
  gateway_breakdown?: {
    sikinapay_volume: number;
    sikinapay_count: number;
    awash_volume: number;
    awash_count: number;
  };
  details: SettlementRow[];
}

export interface SettlementRow {
  auction_id: string;
  product_name: string;
  winning_amount: number;
  participation_fee_revenue: number;
  platform_share: number;
  tax: number;
  commission: number;
  net_to_seller: number;
  payment_status: string;
  settled_at: string | null;
}

export interface DailySettlement {
  date: string;
  participation_fee_revenue: number;
  winning_price_total: number;
  platform_share: number;
  tax: number;
  commission: number;
  net_revenue: number;
  auction_count: number;
}

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  private readonly platformSharePercent: number;
  private readonly taxPercent: number;
  private readonly commissionPercent: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.platformSharePercent =
      this.configService.get<number>('settlement.platformSharePercent') ?? 10;
    this.taxPercent =
      this.configService.get<number>('settlement.taxPercent') ?? 15;
    this.commissionPercent =
      this.configService.get<number>('settlement.commissionPercent') ?? 5;
  }

  async getSettlementReport(
    startDate: string,
    endDate: string,
  ): Promise<SettlementReport> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use ISO 8601 date strings.');
    }

    const participationFeeRevenue = await this.getParticipationFeeRevenue(
      start,
      end,
    );
    const winningData = await this.getWinningData(start, end);

    const winningPriceTotal = winningData.reduce(
      (sum, row) => sum + row.winning_amount,
      0,
    );

    const platformShare =
      (winningPriceTotal * this.platformSharePercent) / 100;
    const tax = (winningPriceTotal * this.taxPercent) / 100;
    const commission = (winningPriceTotal * this.commissionPercent) / 100;
    const netRevenue =
      participationFeeRevenue + platformShare + commission - tax;

    const details: SettlementRow[] = winningData.map((row) => {
      const rowPlatformShare =
        (row.winning_amount * this.platformSharePercent) / 100;
      const rowTax = (row.winning_amount * this.taxPercent) / 100;
      const rowCommission =
        (row.winning_amount * this.commissionPercent) / 100;
      const netToSeller =
        row.winning_amount - rowPlatformShare - rowTax - rowCommission;

      return {
        auction_id: row.auction_id,
        product_name: row.product_name,
        winning_amount: row.winning_amount,
        participation_fee_revenue: row.participation_fee_revenue,
        platform_share: rowPlatformShare,
        tax: rowTax,
        commission: rowCommission,
        net_to_seller: netToSeller,
        payment_status: row.payment_status,
        settled_at: row.settled_at,
      };
    });

    const [transactionCount, gatewayRows, escrowRow] = await Promise.all([
      this.getTransactionCount(start, end),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT gateway::text, COUNT(*)::int as count, COALESCE(SUM(amount), 0)::float as volume
         FROM payment_transactions
         WHERE status = 'SUCCESSFUL'
           AND created_at >= $1 AND created_at <= $2
         GROUP BY gateway`,
        start,
        end,
      ),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT
           COALESCE(SUM(CASE WHEN a.payment_status = 'PENDING' THEN pt.amount ELSE 0 END), 0)::float as held_in_escrow,
           COALESCE(SUM(CASE WHEN a.payment_status = 'PAID' THEN pt.amount ELSE 0 END), 0)::float as released_platform,
           COUNT(CASE WHEN a.payment_status = 'PENDING' THEN 1 ELSE NULL END)::int as pending_delivery
         FROM payment_transactions pt
         JOIN auctions a ON a.id = pt.auction_id
         WHERE pt.payment_type = 'WINNING_BID'
           AND pt.status = 'SUCCESSFUL'
           AND pt.created_at >= $1 AND pt.created_at <= $2`,
        start,
        end,
      ),
    ]);

    const sikinaData = gatewayRows.find((r) => r.gateway === 'SIKINAPAY');
    const awashData = gatewayRows.find((r) => r.gateway === 'AWASH');

    return {
      start_date: startDate,
      end_date: endDate,
      participation_fee_revenue: participationFeeRevenue,
      winning_price_total: winningPriceTotal,
      platform_share: platformShare,
      tax,
      commission,
      net_revenue: netRevenue,
      auction_count: winningData.length,
      transaction_count: transactionCount,
      escrow_summary: {
        total_held_in_escrow: Number(escrowRow[0]?.held_in_escrow || 0),
        total_released_to_platform: Number(escrowRow[0]?.released_platform || 0),
        pending_delivery_count: Number(escrowRow[0]?.pending_delivery || 0),
      },
      gateway_breakdown: {
        sikinapay_volume: Number(sikinaData?.volume || 0),
        sikinapay_count: Number(sikinaData?.count || 0),
        awash_volume: Number(awashData?.volume || 0),
        awash_count: Number(awashData?.count || 0),
      },
      details,
    };
  }

  async getDailySettlement(date: string): Promise<DailySettlement> {
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      throw new Error('Invalid date format. Use ISO 8601 date string.');
    }

    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const participationFeeRevenue = await this.getParticipationFeeRevenue(
      start,
      end,
    );
    const winningData = await this.getWinningData(start, end);

    const winningPriceTotal = winningData.reduce(
      (sum, row) => sum + row.winning_amount,
      0,
    );

    const platformShare =
      (winningPriceTotal * this.platformSharePercent) / 100;
    const tax = (winningPriceTotal * this.taxPercent) / 100;
    const commission = (winningPriceTotal * this.commissionPercent) / 100;
    const netRevenue =
      participationFeeRevenue + platformShare + commission - tax;

    return {
      date,
      participation_fee_revenue: participationFeeRevenue,
      winning_price_total: winningPriceTotal,
      platform_share: platformShare,
      tax,
      commission,
      net_revenue: netRevenue,
      auction_count: winningData.length,
    };
  }

  async exportSettlementCsv(
    startDate: string,
    endDate: string,
  ): Promise<string> {
    const report = await this.getSettlementReport(startDate, endDate);

    const header =
      'auction_id,product_name,winning_amount,participation_fee_revenue,platform_share,tax,commission,net_to_seller,payment_status,settled_at';

    const rows = report.details.map((row) =>
      [
        row.auction_id,
        this.csvEscape(row.product_name),
        row.winning_amount.toFixed(2),
        row.participation_fee_revenue.toFixed(2),
        row.platform_share.toFixed(2),
        row.tax.toFixed(2),
        row.commission.toFixed(2),
        row.net_to_seller.toFixed(2),
        row.payment_status,
        row.settled_at || '',
      ].join(','),
    );

    const summary = [
      '',
      `# Settlement Report: ${startDate} to ${endDate}`,
      `# Participation Fee Revenue,${report.participation_fee_revenue.toFixed(2)}`,
      `# Winning Price Total,${report.winning_price_total.toFixed(2)}`,
      `# Platform Share (${this.platformSharePercent}%),${report.platform_share.toFixed(2)}`,
      `# Tax (${this.taxPercent}% VAT),${report.tax.toFixed(2)}`,
      `# Commission (${this.commissionPercent}%),${report.commission.toFixed(2)}`,
      `# Net Revenue,${report.net_revenue.toFixed(2)}`,
      `# Auction Count,${report.auction_count}`,
      `# Transaction Count,${report.transaction_count}`,
    ];

    return [header, ...rows, ...summary].join('\n');
  }

  async generateSettlementPdf(
    startDate: string,
    endDate: string,
  ): Promise<string> {
    const report = await this.getSettlementReport(startDate, endDate);

    const detailRows = report.details
      .map(
        (row) => `
      <tr>
        <td>${this.htmlEscape(row.auction_id)}</td>
        <td>${this.htmlEscape(row.product_name)}</td>
        <td style="text-align:right">${row.winning_amount.toFixed(2)}</td>
        <td style="text-align:right">${row.participation_fee_revenue.toFixed(2)}</td>
        <td style="text-align:right">${row.platform_share.toFixed(2)}</td>
        <td style="text-align:right">${row.tax.toFixed(2)}</td>
        <td style="text-align:right">${row.commission.toFixed(2)}</td>
        <td style="text-align:right">${row.net_to_seller.toFixed(2)}</td>
        <td>${this.htmlEscape(row.payment_status)}</td>
        <td>${row.settled_at ? this.htmlEscape(row.settled_at) : ''}</td>
      </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Settlement Report: ${this.htmlEscape(startDate)} to ${this.htmlEscape(endDate)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 32px; color: #222; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .period { color: #666; margin-bottom: 24px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .summary .card { border: 1px solid #ddd; border-radius: 6px; padding: 12px; }
    .summary .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary .value { font-size: 16px; font-weight: bold; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: bold; }
    tfoot td { font-weight: bold; background: #fafafa; }
    @media print { body { margin: 0; } .summary { grid-template-columns: repeat(4, 25%); } }
  </style>
</head>
<body>
  <h1>Settlement Report</h1>
  <div class="period">Period: ${this.htmlEscape(startDate)} to ${this.htmlEscape(endDate)}</div>

  <div class="summary">
    <div class="card"><div class="label">Participation Fee Revenue</div><div class="value">${report.participation_fee_revenue.toFixed(2)}</div></div>
    <div class="card"><div class="label">Winning Price Total</div><div class="value">${report.winning_price_total.toFixed(2)}</div></div>
    <div class="card"><div class="label">Platform Share (${this.platformSharePercent}%)</div><div class="value">${report.platform_share.toFixed(2)}</div></div>
    <div class="card"><div class="label">Tax (${this.taxPercent}% VAT)</div><div class="value">${report.tax.toFixed(2)}</div></div>
    <div class="card"><div class="label">Commission (${this.commissionPercent}%)</div><div class="value">${report.commission.toFixed(2)}</div></div>
    <div class="card"><div class="label">Net Revenue</div><div class="value">${report.net_revenue.toFixed(2)}</div></div>
    <div class="card"><div class="label">Auction Count</div><div class="value">${report.auction_count}</div></div>
    <div class="card"><div class="label">Transaction Count</div><div class="value">${report.transaction_count}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Auction ID</th>
        <th>Product Name</th>
        <th style="text-align:right">Winning Amount</th>
        <th style="text-align:right">Participation Fee Revenue</th>
        <th style="text-align:right">Platform Share</th>
        <th style="text-align:right">Tax</th>
        <th style="text-align:right">Commission</th>
        <th style="text-align:right">Net to Seller</th>
        <th>Payment Status</th>
        <th>Settled At</th>
      </tr>
    </thead>
    <tbody>${detailRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="2">Totals</td>
        <td style="text-align:right">${report.winning_price_total.toFixed(2)}</td>
        <td style="text-align:right">${report.participation_fee_revenue.toFixed(2)}</td>
        <td style="text-align:right">${report.platform_share.toFixed(2)}</td>
        <td style="text-align:right">${report.tax.toFixed(2)}</td>
        <td style="text-align:right">${report.commission.toFixed(2)}</td>
        <td style="text-align:right">${report.details.reduce((sum, r) => sum + r.net_to_seller, 0).toFixed(2)}</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
  }

  private htmlEscape(value: string): string {
    if (!value) return '';
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private csvEscape(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private async getParticipationFeeRevenue(
    start: Date,
    end: Date,
  ): Promise<number> {
    const result: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(amount), 0)::float AS total
       FROM transactions
       WHERE type = 'BID_FEE'
         AND created_at >= $1
         AND created_at <= $2`,
      start,
      end,
    );
    return Number(result[0]?.total || 0);
  }

  private async getWinningData(
    start: Date,
    end: Date,
  ): Promise<
    Array<{
      auction_id: string;
      product_name: string;
      winning_amount: number;
      participation_fee_revenue: number;
      payment_status: string;
      settled_at: string | null;
    }>
  > {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT
         a.id AS auction_id,
         p.name AS product_name,
         COALESCE(a.winning_bid_amount, 0)::float AS winning_amount,
         COALESCE(
           (SELECT SUM(t.amount) FROM transactions t
            WHERE t.type = 'BID_FEE'
              AND t.reference_id = a.id::text
              AND t.created_at >= $1
              AND t.created_at <= $2),
           0
         )::float AS participation_fee_revenue,
         COALESCE(a.payment_status, 'UNKNOWN') AS payment_status,
         a.last_payment_update::text AS settled_at
       FROM auctions a
       JOIN products p ON p.id = a.product_id
       WHERE a.status IN ('CLOSED', 'EXPIRED')
         AND a.winning_bid_amount IS NOT NULL
         AND COALESCE(a.last_payment_update, a.created_at) >= $1
         AND COALESCE(a.last_payment_update, a.created_at) <= $2
       ORDER BY COALESCE(a.last_payment_update, a.created_at) DESC`,
      start,
      end,
    );

    return rows.map((row) => ({
      auction_id: row.auction_id,
      product_name: row.product_name || 'Unknown',
      winning_amount: Number(row.winning_amount || 0),
      participation_fee_revenue: Number(row.participation_fee_revenue || 0),
      payment_status: row.payment_status,
      settled_at: row.settled_at,
    }));
  }

  private async getTransactionCount(
    start: Date,
    end: Date,
  ): Promise<number> {
    const result: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total
       FROM payment_transactions
       WHERE created_at >= $1
         AND created_at <= $2`,
      start,
      end,
    );
    return Number(result[0]?.total || 0);
  }
}
