import { Controller, Get, Param, Query, UseInterceptors, Req, UseGuards, ParseUUIDPipe, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AuctionsService } from './auctions.service';
import { CacheInterceptor } from '../common/cache.interceptor';
import { ListAuctionsQueryDto } from '../common/dto/list-auctions-query.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('auctions')
@Controller('auctions')
@UseInterceptors(CacheInterceptor)
export class AuctionsController {
  constructor(private auctionsService: AuctionsService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get active auctions' })
  async getActiveAuctions(@Query() query: ListAuctionsQueryDto) {
    return this.auctionsService.getActiveAuctions(query);
  }

  @Get('closed')
  @ApiOperation({ summary: 'Get closed auctions' })
  async getClosedAuctions(@Query() query: ListAuctionsQueryDto) {
    return this.auctionsService.getClosedAuctions(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-bids')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my bid history' })
  async getMyBidHistory(@Req() req: { user: { id: string; role?: string } }) {
    return this.auctionsService.getUserBidHistory(req.user.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-wins')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my won auctions' })
  async getMyWonAuctions(@Req() req: { user: { id: string; role?: string } }) {
    return this.auctionsService.getUserWonAuctions(req.user.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get auction by ID' })
  async getActiveAuction(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: { user: { id: string; role?: string } }) {
    return this.auctionsService.getActiveAuction(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/bids')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get bid history for auction' })
  async getBidHistory(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: { user: { id: string; role?: string } }) {
    return this.auctionsService.getBidHistory(id, req.user.id);
  }
}
