import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';
import { CaslGuard } from './casl.guard';
import { BetterAuthModule } from '../../auth/better-auth.module';

@Module({
  imports: [BetterAuthModule],
  controllers: [RbacController],
  providers: [RbacService, CaslGuard],
  exports: [RbacService, CaslGuard],
})
export class RbacModule {}