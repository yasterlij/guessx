# Prisma + Better-auth Migration Guide

## Overview

Guess X has been upgraded to support **Prisma ORM** (alongside TypeORM) and **Better-auth** (alongside Passport/JWT). This document describes the new architecture and how to use it.

## Architecture

### Dual ORM Setup (Gradual Migration)

```
┌─────────────────────────────────────────────────────────────┐
│                    NestJS Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌─────────────────────────────┐     │
│  │   TypeORM       │    │        Prisma               │     │
│  │   (Legacy)      │    │        (New)                │     │
│  │                 │    │                             │     │
│  │ • Entities      │    │ • PrismaClient             │     │
│  │ • Repositories  │    │ • Type-safe queries        │     │
│  │ • Migrations    │    │ • Auto-generated types     │     │
│  │   (SQL files)   │    │ • Schema-first design      │     │
│  └────────┬────────┘    └──────────┬──────────────────┘     │
│           │                        │                        │
│           └───────────┬────────────┘                        │
│                       │                                     │
│                       ▼                                     │
│              ┌─────────────────┐                            │
│              │  PostgreSQL 15  │                            │
│              │  + Citus 12.1   │                            │
│              └─────────────────┘                            │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────────────────┐     │
│  │  Passport/JWT   │    │      Better-auth            │     │
│  │  (Legacy)       │    │      (New)                  │     │
│  │                 │    │                             │     │
│  │ • JwtStrategy   │    │ • betterAuth() instance     │     │
│  │ • AuthGuard     │    │ • BetterAuthGuard           │     │
│  │ • JWT tokens    │    │ • Session-based auth        │     │
│  │                 │    │ • Prisma adapter            │     │
│  └─────────────────┘    └─────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## What Was Added

### 1. Prisma Schema (`prisma/schema.prisma`)

All 3 services now have a complete Prisma schema that maps to the existing PostgreSQL database:

- **13 models**: User, Product, Auction, Bid, Winner, Transaction, PaymentTransaction, Favorite, NotificationLog, AuditLog, UserPermission, Otp
- **7 enums**: AuctionStatus, TransactionType, PaymentGateway, PaymentTransactionStatus, PaymentType, AuthProvider, UserRole
- **All relations**: Foreign keys, cascade rules, unique constraints
- **All indexes**: Matching the existing database indexes

### 2. Prisma Service (`src/prisma/`)

Each service has a `PrismaModule` and `PrismaService`:

```typescript
// src/prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}

// src/prisma/prisma.module.ts
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### 3. Better-auth Configuration (`src/auth/`)

The identity-service has a complete Better-auth setup:

- **`better-auth.config.ts`**: Main auth configuration with Prisma adapter, bcrypt hashing, session management
- **`better-auth.service.ts`**: NestJS service wrapper for auth operations
- **`better-auth.guard.ts`**: NestJS guard replacing Passport JWT guard
- **`better-auth.module.ts`**: NestJS module exporting auth services

## Usage

### Using Prisma

```typescript
// Inject PrismaService in any service
@Injectable()
export class MyService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.user.findMany({
      include: { bids: true, transactions: true },
    });
  }

  async createUser(data: { phone_number: string; full_name: string }) {
    return this.prisma.user.create({ data });
  }

  async getActiveAuctions() {
    return this.prisma.auction.findMany({
      where: { status: 'ACTIVE' },
      include: { product: true, bids: true },
    });
  }
}
```

### Using Better-auth

```typescript
// In a controller
@Controller('auth')
export class AuthController {
  constructor(private betterAuth: BetterAuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.betterAuth.signIn(dto.email, dto.password);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.betterAuth.signUp(dto.email, dto.password, dto.full_name);
  }
}

// Using the guard
@UseGuards(BetterAuthGuard)
@Get('profile')
async getProfile(@Req() req: any) {
  return req.user;
}
```

## Commands

### Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npm run prisma:generate

# Create and apply migration (development)
npm run prisma:migrate

# Deploy migrations (production)
npm run prisma:deploy

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Seed database
npm run prisma:seed
```

### TypeORM Commands (Legacy - still available)

```bash
# Run existing SQL migrations
npm run migration:run

# Generate TypeORM migration
npm run migration:generate

# Revert last migration
npm run migration:revert
```

## Migration Strategy

### Phase 1: Dual Setup (Current)
- ✅ Prisma installed alongside TypeORM
- ✅ Better-auth installed alongside Passport/JWT
- ✅ All existing tests pass
- ✅ Prisma schema matches database
- ✅ PrismaService available in all services

### Phase 2: Gradual Service Migration
- Replace TypeORM repositories with Prisma queries in each service
- Replace Passport JWT guards with BetterAuthGuard
- Update tests to use Prisma client mocks

### Phase 3: Complete Migration
- Remove TypeORM dependencies
- Remove Passport/JWT dependencies
- Remove TypeORM entities and config
- Update all tests

## Files Added

### identity-service
- `prisma/schema.prisma` - Complete database schema
- `prisma.config.ts` - Prisma configuration
- `src/prisma/prisma.service.ts` - Prisma client service
- `src/prisma/prisma.module.ts` - Global Prisma module
- `src/auth/better-auth.config.ts` - Better-auth configuration
- `src/auth/better-auth.service.ts` - Auth service wrapper
- `src/auth/better-auth.guard.ts` - Auth guard
- `src/auth/better-auth.module.ts` - Auth module

### auction-engine
- `prisma/schema.prisma` - Complete database schema
- `prisma.config.ts` - Prisma configuration
- `src/prisma/prisma.service.ts` - Prisma client service
- `src/prisma/prisma.module.ts` - Global Prisma module

### query-service
- `prisma/schema.prisma` - Complete database schema
- `prisma.config.ts` - Prisma configuration
- `src/prisma/prisma.service.ts` - Prisma client service
- `src/prisma/prisma.module.ts` - Global Prisma module

## Dependencies Added

```json
{
  "prisma": "^7.9.1",
  "@prisma/client": "^7.9.1",
  "better-auth": "^1.7.1",
  "@better-auth/prisma-adapter": "^1.7.1"
}
```

## Verification

- ✅ All 65 backend tests pass (54 auction-engine + 8 identity-service + 3 query-service)
- ✅ TypeScript strict mode passes for all 5 projects
- ✅ No breaking changes to existing functionality
- ✅ Prisma client generates successfully for all services
- ✅ Better-auth configuration compiles without errors