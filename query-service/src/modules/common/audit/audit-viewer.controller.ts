import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { AuditViewerService } from './audit-viewer.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditViewerController {
  constructor(private readonly auditViewerService: AuditViewerService) {}

  @Get('logs')
  @ApiOperation({ summary: 'List audit logs' })
  async listLogs(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('actor_id') actor_id: string,
    @Query('action') action: string,
    @Query('entity_type') entity_type: string,
    @Query('entity_id') entity_id: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 50, 200);

    const filters = {
      actor_id: actor_id || undefined,
      action: action || undefined,
      entity_type: entity_type || undefined,
      entity_id: entity_id || undefined,
      start_date: start ? new Date(start) : undefined,
      end_date: end ? new Date(end) : undefined,
    };

    if (start && isNaN(filters.start_date!.getTime())) {
      throw new BadRequestException('Invalid start date format');
    }
    if (end && isNaN(filters.end_date!.getTime())) {
      throw new BadRequestException('Invalid end date format');
    }

    return this.auditViewerService.listAuditLogs(filters, pageNum, limitNum);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit stats' })
  async getStats() {
    return this.auditViewerService.getAuditStats();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  async exportCsv(
    @Query('actor_id') actor_id: string,
    @Query('action') action: string,
    @Query('entity_type') entity_type: string,
    @Query('entity_id') entity_id: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: Response,
  ) {
    const filters = {
      actor_id: actor_id || undefined,
      action: action || undefined,
      entity_type: entity_type || undefined,
      entity_id: entity_id || undefined,
      start_date: start ? new Date(start) : undefined,
      end_date: end ? new Date(end) : undefined,
    };

    if (start && isNaN(filters.start_date!.getTime())) {
      throw new BadRequestException('Invalid start date format');
    }
    if (end && isNaN(filters.end_date!.getTime())) {
      throw new BadRequestException('Invalid end date format');
    }

    const csv = await this.auditViewerService.exportAuditLogsCsv(filters);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.send(csv);
  }
}
