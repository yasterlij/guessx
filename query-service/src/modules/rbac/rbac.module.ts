import { Module } from '@nestjs/common';
import { CaslGuard } from './casl.guard';

@Module({
  providers: [CaslGuard],
  exports: [CaslGuard],
})
export class RbacModule {}
