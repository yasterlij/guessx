import { Provider } from "@nestjs/common";
import { Redis } from "ioredis";
import { REDIS_CLIENT } from "./redis.decorator";

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: () => {
    return new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  },
};
