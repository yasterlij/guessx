import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { FavoritesService } from './favorites.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user favorites' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFavorites(
    @Req() req: { user: { id: string; role?: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit || '100', 10) || 100));
    return this.favoritesService.getUserFavorites(req.user.id, pageNum, limitNum);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':auctionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add favorite' })
  async addFavorite(@Param('auctionId') auctionId: string, @Req() req: { user: { id: string; role?: string } }) {
    if (!UUID_REGEX.test(auctionId)) {
      throw new BadRequestException('Invalid auction ID');
    }
    return this.favoritesService.addFavorite(req.user.id, auctionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':auctionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove favorite' })
  async removeFavorite(@Param('auctionId') auctionId: string, @Req() req: { user: { id: string; role?: string } }) {
    if (!UUID_REGEX.test(auctionId)) {
      throw new BadRequestException('Invalid auction ID');
    }
    await this.favoritesService.removeFavorite(req.user.id, auctionId);
    return { removed: true };
  }
}
