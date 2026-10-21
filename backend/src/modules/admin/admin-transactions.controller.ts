import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Req,
  Param,
  Query,
  UseGuards,
  Res,
  BadRequestException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AdminTransactionsService } from './admin-transactions.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin-transactions')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminTransactionsController {
  constructor(
    private readonly transactionsService: AdminTransactionsService,
  ) {}

  @Get('transactions/all')
  @ApiOperation({ summary: 'Get unified transactions across all auctions and wallets' })
  async getAllTransactions(
    @Query('auction_id') auction_id?: string,
    @Query('user_id') user_id?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.transactionsService.getAllTransactions(
      { auction_id, user_id, type, category, status, start, end, search },
      page,
      limit,
    );
  }

  @Get('auctions/:id/transactions')
  @ApiOperation({ summary: 'Get dedicated per-auction transaction log and revenue sharing' })
  async getAuctionTransactions(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Auction ID is required');
    }
    return this.transactionsService.getAuctionTransactions(id);
  }

  @Get('auctions/:id/settlement-config')
  @ApiOperation({ summary: 'Get custom settlement configuration for an auction' })
  async getAuctionSettlementConfig(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Auction ID is required');
    }
    return this.transactionsService.getAuctionSettlementConfig(id);
  }

  @Post('auctions/:id/settlement-config')
  @ApiOperation({ summary: 'Save custom settlement configuration for an auction' })
  async saveAuctionSettlementConfig(
    @Param('id') id: string,
    @Body()
    dto: {
      winning_price?: number;
      bid_fees_collected?: number;
      platform_share?: number;
      platform_share_percent?: number;
      tax?: number;
      tax_percent?: number;
      commission?: number;
      commission_percent?: number;
      net_to_seller?: number;
    },
    @Req() req: { user: { id: string; role?: string } },
  ) {
    if (!id) {
      throw new BadRequestException('Auction ID is required');
    }
    const actorId = req.user?.id || 'admin';
    return this.transactionsService.saveAuctionSettlementConfig(id, dto, actorId);
  }

  @Delete('auctions/:id/settlement-config')
  @ApiOperation({ summary: 'Reset custom settlement configuration for an auction' })
  async resetAuctionSettlementConfig(
    @Param('id') id: string,
    @Req() req: { user: { id: string; role?: string } },
  ) {
    if (!id) {
      throw new BadRequestException('Auction ID is required');
    }
    const actorId = req.user?.id || 'admin';
    return this.transactionsService.resetAuctionSettlementConfig(id, actorId);
  }

  @Get('transactions/export')
  @ApiOperation({ summary: 'Export filtered transactions as CSV or XLSX' })
  async exportTransactions(
    @Query('auction_id') auction_id: string,
    @Query('user_id') user_id: string,
    @Query('type') type: string,
    @Query('category') category: string,
    @Query('status') status: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('search') search: string,
    @Res() res: Response,
  ) {
    const csv = await this.transactionsService.exportTransactionsCsv({
      auction_id,
      user_id,
      type,
      category,
      status,
      start,
      end,
      search,
    });

    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transactions-${timestamp}.csv`,
    );
    res.send(csv);
  }

  @Get('compliance/report')
  @ApiOperation({ summary: 'Generate UNCITRAL & ICC Auction Compliance Report' })
  async getComplianceReport(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    if (!start || !end) {
      throw new BadRequestException('start and end date parameters are required');
    }
    return this.transactionsService.getComplianceReport(start, end);
  }
}
