import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'guessx-jwt-secret') {
    throw new Error('JWT_SECRET environment variable is required and must not be the default value');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'guessx-refresh-secret') {
    throw new Error('JWT_REFRESH_SECRET environment variable is required and must not be the default value');
  }
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    jwtSecret: process.env.JWT_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    databaseUrl:
      process.env.DATABASE_URL ||
      'postgresql://admin:secret@localhost:5433/guessx_db',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    smsApiKey: process.env.SMS_API_KEY || '',
    internalApiKey: process.env.INTERNAL_API_KEY || '',
    fintechWebhookSecret: process.env.FINTECH_WEBHOOK_SECRET || '',
  };
});
