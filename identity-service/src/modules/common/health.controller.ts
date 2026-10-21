import { Controller, Get, Inject, Res, HttpCode } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

const VERSION = '1.0.0';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check(@Res({ passthrough: true }) res: Response) {
    const dependencies: Record<string, string> = {};
    let status: 'ok' | 'degraded' = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dependencies['database'] = 'connected';
    } catch {
      dependencies['database'] = 'disconnected';
      status = 'degraded';
    }

    try {
      await this.redis.ping();
      dependencies['redis'] = 'connected';
    } catch {
      dependencies['redis'] = 'disconnected';
      status = 'degraded';
    }

    if (status === 'degraded') {
      res.status(503);
    }

    return {
      status,
      uptime: process.uptime(),
      version: VERSION,
      environment: process.env.NODE_ENV || 'development',
      dependencies,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  async readiness(@Res({ passthrough: true }) res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch {
      res.status(503);
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('live')
  @HttpCode(200)
  @ApiOperation({ summary: 'Liveness check' })
  liveness() {
    return {
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('schema-check')
  @ApiOperation({ summary: 'Database schema diagnostics' })
  async schemaCheck() {
    let columns: any = [];
    try {
      columns = await this.prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `;
    } catch (e: any) {
      columns = { error: e.message };
    }
    return { columns };
  }
}
