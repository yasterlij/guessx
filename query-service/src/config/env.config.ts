import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'guessx-jwt-secret') {
    throw new Error('JWT_SECRET environment variable is required and must not be the default value');
  }
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    jwtSecret: process.env.JWT_SECRET,
    internalApiKey: process.env.INTERNAL_API_KEY || '',
    databaseUrl:
      process.env.DATABASE_URL ||
      'postgresql://admin:secret@localhost:5433/guessx_db',
    readReplicaUrl: process.env.READ_REPLICA_URL || undefined,
  };
});
