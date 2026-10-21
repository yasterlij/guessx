import { plainToInstance } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsNotEmpty, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsNumber()
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  READ_REPLICA_URL?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }
  if (config.NODE_ENV === 'production' && !validated.CORS_ORIGINS?.trim()) {
    throw new Error(
      'Environment validation failed: CORS_ORIGINS is required in production',
    );
  }
  return validated;
}
