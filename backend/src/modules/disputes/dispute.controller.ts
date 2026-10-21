import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BetterAuthGuard } from '../../auth/better-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { DisputeService } from './dispute.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { UpdateDisputeStatusDto } from './dto/update-dispute-status.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('disputes')
@ApiBearerAuth()
@Controller('disputes')
@UseGuards(BetterAuthGuard)
export class DisputeController {
  constructor(private disputeService: DisputeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a dispute' })
  async createDispute(@Req() req: any, @Body() dto: CreateDisputeDto) {
    return this.disputeService.createDispute(
      req.user.id,
      dto.auction_id ?? null,
      dto.type,
      dto.description,
      dto.document_urls,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List user disputes' })
  async listDisputes(@Req() req: any) {
    return this.disputeService.listDisputes(req.user.id);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all disputes (admin)' })
  async listAllDisputes(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.disputeService.listAllDisputes(
      status,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute by ID' })
  async getDispute(@Param('id') id: string, @Req() req: any) {
    return this.disputeService.getDispute(id, req.user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update dispute status' })
  async updateDisputeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDisputeStatusDto,
    @Req() req: any,
  ) {
    return this.disputeService.updateDisputeStatus(
      id,
      dto.status,
      dto.resolution,
      req.user.id,
      dto.document_urls,
    );
  }
}
