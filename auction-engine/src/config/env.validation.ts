import { plainToInstance } from "class-transformer";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  validateSync,
} from "class-validator";

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
  @IsNotEmpty()
  REDIS_URL: string;

  @IsNumber()
  @IsOptional()
  BID_FEE: number = 1;

  @IsString()
  @IsOptional()
  SIKINA_SECRET_KEY: string = "";

  @IsString()
  @IsOptional()
  SIKINA_WEBHOOK_SECRET: string = "";

  @IsString()
  @IsOptional()
  SIKINA_BASE_URL: string = "https://sandbox.sikinapay.com";

  @IsString()
  @IsOptional()
  SIKINA_SUCCESS_REDIRECT_URL: string = "";

  @IsString()
  @IsOptional()
  SIKINA_FAILED_REDIRECT_URL: string = "";

  @IsString()
  @IsOptional()
  SIKINA_WEBHOOK_URL: string = "";

  @IsString()
  @IsOptional()
  APP_BASE_URL: string = "http://localhost:5173";

  @IsString()
  @IsOptional()
  AWASH_MERCHANT_ID: string = "";

  @IsString()
  @IsOptional()
  AWASH_SECRET_KEY: string = "";

  @IsString()
  @IsOptional()
  AWASH_WEBHOOK_SECRET: string = "";

  @IsString()
  @IsOptional()
  AWASH_BASE_URL: string = "https://sandbox.awashbank.com";

  @IsString()
  @IsNotEmpty()
  INTERNAL_API_KEY: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = "";
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }
  if (config.NODE_ENV === "production" && !validated.CORS_ORIGINS.trim()) {
    throw new Error(
      "Environment validation failed: CORS_ORIGINS is required in production",
    );
  }
  return validated;
}
