import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => {
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET === "guessx-jwt-secret"
  ) {
    throw new Error(
      "JWT_SECRET environment variable is required and must not be the default value",
    );
  }
  return {
    port: parseInt(process.env.PORT || "3000", 10),
    jwtSecret: process.env.JWT_SECRET,
    databaseUrl:
      process.env.DATABASE_URL ||
      "postgresql://admin:secret@localhost:5433/guessx_db",
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
    bidFee: parseFloat(process.env.BID_FEE || "1"),
    appBaseUrl: process.env.APP_BASE_URL || "http://localhost:5173",
    awashMerchantId: process.env.AWASH_MERCHANT_ID || "",
    awashSecretKey: process.env.AWASH_SECRET_KEY || "",
    awashWebhookSecret: process.env.AWASH_WEBHOOK_SECRET || "",
    awashBaseUrl: process.env.AWASH_BASE_URL || "https://sandbox.awashbank.com",
    internalApiKey: process.env.INTERNAL_API_KEY || "",
    uploadBaseUrl:
      process.env.UPLOAD_BASE_URL ||
      `http://localhost:${parseInt(process.env.PORT || "3000", 10)}`,
  };
});
