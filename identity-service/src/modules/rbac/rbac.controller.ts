import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RbacService } from './rbac.service';
import { CaslGuard, RequireAbility } from './casl.guard';
import { AppAction, AppSubject } from './rbac.constants';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BetterAuthGuard } from '../../auth/better-auth.guard';

@ApiTags('rbac')
@ApiBearerAuth()
@Controller('rbac')
@UseGuards(BetterAuthGuard, CaslGuard)
export class RbacController {
  constructor(private rbacService: RbacService) {}

  @Get('abilities')
  @ApiOperation({ summary: 'Get my abilities' })
  async getMyAbilities(@Req() req: any) {
    return this.rbacService.getUserAbilities(req.user);
  }

  @Get('access-decisions')
  @RequireAbility(AppAction.READ, AppSubject.AUDIT_LOG)
  @ApiOperation({ summary: 'Get access decisions' })
  async getAccessDecisions(
    @Query('user_id') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rbacService.getAccessDecisions(
      userId,
      parseInt(page || '1', 10),
      parseInt(limit || '50', 10),
    );
  }

  @Get('overrides')
  @RequireAbility(AppAction.READ, AppSubject.PERMISSION)
  @ApiOperation({ summary: 'List permission overrides' })
  async listOverrides(
    @Query('user_id') userId?: string,
    @Query('active') active?: string,
  ) {
    return this.rbacService.listOverrides({
      userId,
      activeOnly: active === 'true',
    });
  }

  @Post('overrides')
  @RequireAbility(AppAction.GRANT, AppSubject.PERMISSION)
  @ApiOperation({ summary: 'Grant permission override' })
  async grantOverride(
    @Req() req: any,
    @Body() body: {
      user_id: string;
      permissions: Record<string, string[]>;
      reason: string;
      expires_at: string;
    },
  ) {
    return this.rbacService.grantTemporaryAccess(
      body.user_id,
      body.permissions,
      req.user.id,
      body.reason,
      new Date(body.expires_at),
    );
  }

  @Patch('overrides/:id/revoke')
  @RequireAbility(AppAction.REVOKE, AppSubject.PERMISSION)
  @ApiOperation({ summary: 'Revoke permission override' })
  async revokeOverride(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.rbacService.revokeOverride(id, req.user.id);
  }

  @Get('check')
  @ApiOperation({ summary: 'Check permission' })
  async checkPermission(
    @Req() req: any,
    @Query('action') action: string,
    @Query('subject') subject: string,
  ) {
    const granted = await this.rbacService.checkAccess(
      req.user,
      action as AppAction,
      subject as AppSubject,
    );
    return { granted, action, subject, role: req.user.role };
  }
}