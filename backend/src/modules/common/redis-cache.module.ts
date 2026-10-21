import { Global, Module } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  providers: [
    RedisCacheService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (cacheService: RedisCacheService) => cacheService.client,
      inject: [RedisCacheService],
    },
  ],
  exports: [RedisCacheService, 'REDIS_CLIENT'],
})
export class RedisCacheModule {}
