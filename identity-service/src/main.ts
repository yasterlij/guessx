import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './modules/common/exception.filter';
import { RequestIdMiddleware } from './modules/common/request-id.middleware';
import { StructuredLogger } from './modules/common/logger.service';
import { globalRateLimit } from './modules/common/global-rate-limit.middleware';

const SHUTDOWN_TIMEOUT_MS = 10_000;
let isShuttingDown = false;

async function gracefulShutdown(app: INestApplication, signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  const logger = app.get(StructuredLogger);
  logger.log(`Received ${signal}, shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    logger.error(`Graceful shutdown exceeded ${SHUTDOWN_TIMEOUT_MS / 1000}s, forcing exit.`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    await app.close();
    clearTimeout(forceExit);
    logger.log('Graceful shutdown complete.');
    process.exit(0);
  } catch (err) {
    clearTimeout(forceExit);
    logger.error('Error during graceful shutdown.', (err as Error).stack);
    process.exit(1);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
    rawBody: true,
  });

  app.enableShutdownHooks();

  app.use(helmet());
  app.use(compression());

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('X-API-Version', '1.0');
    res.setHeader('X-API-Deprecated', 'false');
    next();
  });

  app.use(globalRateLimit);

  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-bid-nonce', 'x-bid-timestamp', 'x-request-id'],
    exposedHeaders: ['x-request-id', 'x-rate-limit-remaining', 'X-Cache'],
    maxAge: 3600,
  });

  const configService = app.get(ConfigService);
  const port = configService.get('app.port', 3000);

  const requestIdMiddleware = new RequestIdMiddleware();
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    requestIdMiddleware.use(req, res, next);
  });
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Guess X Identity Service')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);

  process.on('SIGTERM', () => gracefulShutdown(app, 'SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown(app, 'SIGINT'));
}

bootstrap();
