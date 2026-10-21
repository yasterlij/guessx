import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { WinnerManagementService } from './winner-management.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin-winners')
@ApiBearerAuth()
@Controller('admin/winners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class WinnerManagementController {
  constructor(
    private winnerManagementService: WinnerManagementService,
  ) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get pending winners' })
  async getPendingWinners() {
    return this.winnerManagementService.getPendingWinners();
  }

  @Get('expired')
  @ApiOperation({ summary: 'Get expired winners' })
  async getExpiredWinners() {
    return this.winnerManagementService.getExpiredWinners();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get winner stats' })
  async getWinnerStats() {
    return this.winnerManagementService.getWinnerStats();
  }

  @Post(':id/extend-deadline')
  @ApiOperation({ summary: 'Extend payment deadline' })
  async extendPaymentDeadline(
    @Param('id') winnerId: string,
    @Body() body: { new_deadline?: string },
    @Req() req: { user: { id: string; role?: string } },
  ) {
    if (!body?.new_deadline) {
      throw new BadRequestException('new_deadline is required in the body');
    }
    const newDeadline = new Date(body.new_deadline);
    if (isNaN(newDeadline.getTime())) {
      throw new BadRequestException(
        'new_deadline must be a valid ISO 8601 date string',
      );
    }
    return this.winnerManagementService.extendPaymentDeadline(
      winnerId,
      newDeadline,
      req.user.id,
    );
  }

  @Post(':id/confirm-payment')
  @ApiOperation({ summary: 'Confirm winner payment' })
  async confirmPayment(@Param('id') winnerId: string, @Req() req: { user: { id: string; role?: string } }) {
    return this.winnerManagementService.confirmPayment(winnerId, req.user.id);
  }

  @Post(':id/remind')
  @ApiOperation({ summary: 'Send payment reminder to winner' })
  async sendPaymentReminder(@Param('id') winnerId: string, @Req() req: { user: { id: string; role?: string } }) {
    return this.winnerManagementService.sendPaymentReminder(winnerId, req.user.id);
  }

  @Post('auction/:auctionId/rotate')
  @ApiOperation({ summary: 'Trigger winner rotation' })
  async triggerRotation(@Param('auctionId') auctionId: string, @Req() req: { user: { id: string; role?: string } }) {
    return this.winnerManagementService.triggerRotation(
      auctionId,
      req.user.id,
    );
  }

  @Get('bidder/:userId/history')
  @ApiOperation({ summary: 'Get bidder history and compliance statistics' })
  async getBidderHistory(@Param('userId') userId: string) {
    return this.winnerManagementService.getBidderHistory(userId);
  }

  @Get(':auctionId')
  @ApiOperation({ summary: 'Get winners for auction' })
  async getWinners(@Param('auctionId') auctionId: string) {
    return this.winnerManagementService.getWinners(auctionId);
  }
}
