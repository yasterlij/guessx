import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const GENERAL_LIMIT = 100;
const GENERAL_WINDOW_SECONDS = 60;
const BIDDING_LIMIT = 10;
const BIDDING_WINDOW_SECONDS = 1;

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    });
  }
  return redisClient;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function getUserId(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  try {
    const token = authHeader.substring(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
    return payload.sub || payload.userId || null;
  } catch {
    return null;
  }
}

function isBiddingEndpoint(req: Request): boolean {
  const url = req.originalUrl || req.url;
  return url.includes('/bids') && req.method === 'POST';
}

function isExemptEndpoint(req: Request): boolean {
  const url = req.originalUrl || req.url || '';
  const path = url.split('?')[0];
  return (
    path === '/api/v1/health' ||
    path === '/health' ||
    path.endsWith('/health') ||
    path === '/metrics' ||
    path === '/api/v1/metrics' ||
    path.endsWith('/metrics')
  );
}

export async function globalRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (isExemptEndpoint(req)) {
    return next();
  }

  try {
    const redis = getRedisClient();
    const ip = getClientIp(req);

    if (isBiddingEndpoint(req)) {
      const userId = getUserId(req);
      const identifier = userId || ip;
      const key = `rate-limit:bid:${identifier}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, BIDDING_WINDOW_SECONDS);
      } else {
        const ttl = await redis.ttl(key);
        if (ttl === -1) {
          await redis.expire(key, BIDDING_WINDOW_SECONDS);
        }
      }
      const remaining = Math.max(BIDDING_LIMIT - count, 0);
      res.setHeader('x-rate-limit-remaining', remaining.toString());
      if (count > BIDDING_LIMIT) {
        res.setHeader('Retry-After', BIDDING_WINDOW_SECONDS.toString());
        res.status(429).json({
          statusCode: 429,
          message: 'Too many bidding requests. Please slow down.',
          error: 'Too Many Requests',
        });
        return;
      }
    } else {
      const key = `rate-limit:api:${ip}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, GENERAL_WINDOW_SECONDS);
      } else {
        const ttl = await redis.ttl(key);
        if (ttl === -1) {
          await redis.expire(key, GENERAL_WINDOW_SECONDS);
        }
      }
      const remaining = Math.max(GENERAL_LIMIT - count, 0);
      res.setHeader('x-rate-limit-remaining', remaining.toString());
      if (count > GENERAL_LIMIT) {
        res.setHeader('Retry-After', GENERAL_WINDOW_SECONDS.toString());
        res.status(429).json({
          statusCode: 429,
          message: 'Too many requests. Please try again later.',
          error: 'Too Many Requests',
        });
        return;
      }
    }

    next();
  } catch {
    next();
  }
}
