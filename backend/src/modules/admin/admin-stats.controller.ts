import {
  Controller,
  Get,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AdminStatsService } from './admin-stats.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminStatsController {
  constructor(private statsService: AdminStatsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get admin stats' })
  async getStats() {
    return this.statsService.getStats();
  }

  @Get('analytics/revenue-forecast')
  @ApiOperation({ summary: 'Get revenue forecast' })
  async getRevenueForecast(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.statsService.getRevenueForecast(days);
  }

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Get revenue analytics for a date range' })
  async getRevenueAnalytics(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.statsService.getRevenueAnalytics({
      startDate: start,
      endDate: end,
    });
  }

  @Get('analytics/product-engagement')
  @ApiOperation({ summary: 'Get per-product engagement metrics' })
  async getProductEngagement(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('category') category?: string,
  ) {
    return this.statsService.getProductEngagement({
      startDate: start,
      endDate: end,
      category,
    });
  }

  @Get('analytics/category-distribution')
  @ApiOperation({ summary: 'Get category-level interest distribution' })
  async getCategoryDistribution(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.statsService.getCategoryDistribution({
      startDate: start,
      endDate: end,
    });
  }

  @Get('analytics/bid-volume')
  @ApiOperation({ summary: 'Get bid volume time series' })
  async getBidVolume(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.statsService.getBidVolume({
      startDate: start,
      endDate: end,
      granularity,
    });
  }
}
