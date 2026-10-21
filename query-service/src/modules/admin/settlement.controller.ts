import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { SettlementService } from './settlement.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin-settlement')
@ApiBearerAuth()
@Controller('admin/settlement')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class SettlementController {
  constructor(private settlementService: SettlementService) {}

  @Get('report')
  @ApiOperation({ summary: 'Get settlement report' })
  async getReport(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    if (!start || !end) {
      throw new BadRequestException('start and end query params are required');
    }
    return this.settlementService.getSettlementReport(start, end);
  }

  @Get('daily')
  @ApiOperation({ summary: 'Get daily settlement' })
  async getDaily(@Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('date query param is required');
    }
    return this.settlementService.getDailySettlement(date);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export settlement as CSV' })
  async exportCsv(
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: Response,
  ) {
    if (!start || !end) {
      throw new BadRequestException('start and end query params are required');
    }
    const csv = await this.settlementService.exportSettlementCsv(start, end);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=settlement-${start}-to-${end}.csv`,
    );
    res.send(csv);
  }

  @Get('pdf')
  @ApiOperation({ summary: 'Export settlement as PDF' })
  async exportPdf(
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: Response,
  ) {
    if (!start || !end) {
      throw new BadRequestException('start and end query params are required');
    }
    const html = await this.settlementService.generateSettlementPdf(start, end);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
