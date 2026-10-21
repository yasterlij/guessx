import { Module } from '@nestjs/common';
import { AdminController, AuditController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { PermissionsGuard } from '../common/permissions.guard';

@Module({
  controllers: [AdminController, AuditController],
  providers: [AdminService, AuditService, PermissionsGuard],
  exports: [PermissionsGuard],
})
export class AdminModule {}