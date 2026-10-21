import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    password: {
      hash: {
        generate: async (password: string) => bcrypt.hashSync(password, 12),
        verify: async (password: string, hash: string) => bcrypt.compareSync(password, hash),
      } as any,
    },
  },
  session: {
    expiresIn: 60 * 15,
    updateAge: 60,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    cookies: {
      sessionToken: {
        name: 'guessx_session',
        attributes: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        },
      },
    },
  },
  rateLimit: {
    window: 60,
    max: 5,
  },
  user: {
    fields: {
      name: 'full_name',
      image: 'avatar_url',
    },
    additionalFields: {
      phone_number: {
        type: 'string',
        required: false,
      },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
      },
      wallet_balance: {
        type: 'number',
        required: false,
        defaultValue: 0,
      },
      is_banned: {
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      auth_provider: {
        type: 'string',
        required: false,
        defaultValue: 'LOCAL',
      },
      phone_verified: {
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
    },
  },
});

export type Auth = typeof auth;