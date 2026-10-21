import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditViewerService } from './audit-viewer.service';
import { AuditViewerController } from './audit-viewer.controller';

@Module({
  controllers: [AuditViewerController],
  providers: [AuditService, AuditViewerService],
  exports: [AuditService, AuditViewerService],
})
export class AuditModule {}
