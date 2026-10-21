import {
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';
import { BetterAuthGuard } from '../../auth/better-auth.guard';
import { TcService } from './tc.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('terms-conditions')
@Controller('auth')
export class TcController {
  constructor(private tcService: TcService) {}

  @UseGuards(BetterAuthGuard)
  @Post('accept-tc')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept terms and conditions' })
  async acceptTc(@Req() req: any, @Body('version') version: string) {
    return this.tcService.acceptTc(req.user.id, version);
  }

  @UseGuards(BetterAuthGuard)
  @Get('tc-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get terms and conditions acceptance status' })
  async getTcStatus(@Req() req: any) {
    const { accepted, version } = await this.tcService.hasAcceptedTc(req.user.id);
    return {
      accepted,
      version,
      current_version: this.tcService.getCurrentTcVersion(),
    };
  }
}
