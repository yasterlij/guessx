import {
  Injectable,
  BadRequestException,
  ConflictException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { User, AuthProvider } from "./entities/user.entity";
import { RegisterDto } from "./dto/register.dto";
import { SuperAppRegistry } from "./adapters/super-app-registry";
import { AuthTokenService } from "./auth-token.service";
import { AuthAuditService } from "./auth-audit.service";

const SAFE_USER_SELECT = {
  id: true,
  phone_number: true,
  email: true,
  password_hash: true,
  wallet_balance: true,
  full_name: true,
  avatar_url: true,
  hashed_refresh_token: true,
  auth_provider: true,
  provider_id: true,
  phone_verified: true,
  role: true,
  created_at: true,
};

const SAFE_TYPEORM_SELECT = [
  "id",
  "phone_number",
  "email",
  "password_hash",
  "wallet_balance",
  "full_name",
  "avatar_url",
  "hashed_refresh_token",
  "auth_provider",
  "provider_id",
  "phone_verified",
  "role",
  "created_at",
] as const;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private superAppRegistry: SuperAppRegistry,
    private authTokenService: AuthTokenService,
    private authAuditService: AuthAuditService,
    @Optional()
    private prisma?: PrismaService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ user: any; access_token: string; refresh_token: string }> {
    if (this.prisma) {
      const existing = dto.phone_number
        ? await this.prisma.user.findFirst({
            where: { phone_number: dto.phone_number },
            select: { id: true },
          })
        : dto.email
          ? await this.prisma.user.findFirst({
              where: { email: dto.email },
              select: { id: true },
            })
          : null;

      if (existing) {
        throw new ConflictException("User already exists");
      }

      const createData: any = {
        phone_number: dto.phone_number ?? null,
        email: dto.email ?? null,
        full_name: dto.full_name ?? null,
      };

      if (dto.password) {
        createData.password_hash = await bcrypt.hash(dto.password, 12);
        createData.auth_provider = AuthProvider.LOCAL;
      } else if (dto.provider) {
        createData.auth_provider = AuthProvider.SUPER_APP;
        createData.provider_id = dto.provider_id!;
      }

      const saved = await this.prisma.user.create({
        data: createData,
        select: SAFE_USER_SELECT,
      });

      const tokens = await this.authTokenService.generateTokens(saved as any);
      const hashed_refresh_token = await bcrypt.hash(tokens.refresh_token, 12);

      await this.prisma.user.update({
        where: { id: saved.id },
        data: { hashed_refresh_token },
        select: { id: true },
      });

      const { password_hash: _ph, hashed_refresh_token: _hrt, ...safeSaved } = saved as any;
      return { user: safeSaved, ...tokens };
    }

    const existing = dto.phone_number
      ? await this.userRepository.findOne({
          where: { phone_number: dto.phone_number },
          select: SAFE_TYPEORM_SELECT as any,
        })
      : dto.email
        ? await this.userRepository.findOne({
            where: { email: dto.email },
            select: SAFE_TYPEORM_SELECT as any,
          })
        : null;

    if (existing) {
      throw new ConflictException("User already exists");
    }

    const user = new User();
    user.phone_number = dto.phone_number ?? null;
    user.email = dto.email ?? null;
    user.full_name = dto.full_name ?? null;

    if (dto.password) {
      user.password_hash = await bcrypt.hash(dto.password, 12);
      user.auth_provider = AuthProvider.LOCAL;
    } else if (dto.provider) {
      user.auth_provider = AuthProvider.SUPER_APP;
      user.provider_id = dto.provider_id!;
    }

    const saved = await this.userRepository.save(user);
    const tokens = await this.authTokenService.generateTokens(saved);

    saved.hashed_refresh_token = await bcrypt.hash(tokens.refresh_token, 12);
    await this.userRepository.save(saved);

    const { password_hash: _ph2, hashed_refresh_token: _hrt2, ...safeUser } = saved as any;
    return { user: safeUser, ...tokens };
  }

  async validateLocalUser(
    email: string,
    password: string,
  ): Promise<any | null> {
    if (this.prisma) {
      const user = await this.prisma.user.findFirst({
        where: { email },
        select: SAFE_USER_SELECT,
      });
      if (!user || !user.password_hash) return null;
      const valid = await bcrypt.compare(password, user.password_hash);
      return valid ? user : null;
    }

    const user = await this.userRepository.findOne({
      where: { email },
      select: SAFE_TYPEORM_SELECT as any,
    });
    if (!user || !user.password_hash) return null;
    const valid = await bcrypt.compare(password, user.password_hash);
    return valid ? user : null;
  }

  async validateLocalUserByPhone(
    phone: string,
    password: string,
  ): Promise<any | null> {
    if (this.prisma) {
      const user = await this.prisma.user.findFirst({
        where: { phone_number: phone },
        select: SAFE_USER_SELECT,
      });
      if (!user || !user.password_hash) return null;
      const valid = await bcrypt.compare(password, user.password_hash);
      return valid ? user : null;
    }

    const user = await this.userRepository.findOne({
      where: { phone_number: phone },
      select: SAFE_TYPEORM_SELECT as any,
    });
    if (!user || !user.password_hash) return null;
    const valid = await bcrypt.compare(password, user.password_hash);
    return valid ? user : null;
  }

  async validateTeleBirrUser(
    accessToken: string,
    phoneNumber: string,
  ): Promise<any> {
    if (this.prisma) {
      let user = await this.prisma.user.findFirst({
        where: { phone_number: phoneNumber },
        select: SAFE_USER_SELECT,
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            phone_number: phoneNumber,
            auth_provider: AuthProvider.TELEBIRR,
            provider_id: accessToken,
          },
          select: SAFE_USER_SELECT,
        });
      }
      return user;
    }

    let user = await this.userRepository.findOne({
      where: { phone_number: phoneNumber },
      select: SAFE_TYPEORM_SELECT as any,
    });

    if (!user) {
      user = this.userRepository.create({
        phone_number: phoneNumber,
        auth_provider: AuthProvider.TELEBIRR,
        provider_id: accessToken,
      });
      user = await this.userRepository.save(user);
    }

    return user;
  }

  async validateBankingUser(
    apiToken: string,
    bankAccount?: string,
  ): Promise<any> {
    if (this.prisma) {
      let user = bankAccount
        ? await this.prisma.user.findFirst({
            where: { phone_number: bankAccount },
            select: SAFE_USER_SELECT,
          })
        : null;

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            phone_number: bankAccount || `bank_${Date.now()}`,
            auth_provider: AuthProvider.BANKING_API,
            provider_id: apiToken,
          },
          select: SAFE_USER_SELECT,
        });
      }
      return user;
    }

    let user = bankAccount
      ? await this.userRepository.findOne({
          where: { phone_number: bankAccount },
          select: SAFE_TYPEORM_SELECT as any,
        })
      : null;

    if (!user) {
      user = this.userRepository.create({
        phone_number: bankAccount || `bank_${Date.now()}`,
        auth_provider: AuthProvider.BANKING_API,
        provider_id: apiToken,
      });
      user = await this.userRepository.save(user);
    }

    return user;
  }

  async validateSuperAppUser(
    provider: string,
    code: string,
    redirectUri: string,
  ): Promise<any> {
    const adapter = this.superAppRegistry.get(provider);
    const accessToken = await adapter.exchangeCode(code, redirectUri);
    const superAppUser = await adapter.getUserInfo(accessToken);

    if (this.prisma) {
      let user = superAppUser.phone_number
        ? await this.prisma.user.findFirst({
            where: { phone_number: superAppUser.phone_number },
            select: SAFE_USER_SELECT,
          })
        : superAppUser.email
          ? await this.prisma.user.findFirst({
              where: { email: superAppUser.email },
              select: SAFE_USER_SELECT,
            })
          : null;

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            phone_number: superAppUser.phone_number,
            email: superAppUser.email,
            full_name: superAppUser.full_name,
            avatar_url: superAppUser.avatar_url,
            auth_provider: AuthProvider.SUPER_APP,
            provider_id: superAppUser.id,
          },
          select: SAFE_USER_SELECT,
        });
      }
      return user;
    }

    let user = superAppUser.phone_number
      ? await this.userRepository.findOne({
          where: { phone_number: superAppUser.phone_number },
          select: SAFE_TYPEORM_SELECT as any,
        })
      : superAppUser.email
        ? await this.userRepository.findOne({
            where: { email: superAppUser.email },
            select: SAFE_TYPEORM_SELECT as any,
          })
        : null;

    if (!user) {
      user = this.userRepository.create({
        phone_number: superAppUser.phone_number,
        email: superAppUser.email,
        full_name: superAppUser.full_name,
        avatar_url: superAppUser.avatar_url,
        auth_provider: AuthProvider.SUPER_APP,
        provider_id: superAppUser.id,
      });
      user = await this.userRepository.save(user);
    }

    return user;
  }

  async login(
    user: any,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: { id: string; role: string; phone_number: string };
  }> {
    const tokens = await this.authTokenService.generateTokens(user);
    const hashed_refresh_token = await bcrypt.hash(tokens.refresh_token, 12);
    if (this.prisma) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { hashed_refresh_token },
        select: { id: true },
      });
    } else {
      user.hashed_refresh_token = hashed_refresh_token;
      await this.userRepository.save(user);
    }
    return {
      ...tokens,
      user: {
        id: user.id,
        role: user.role,
        phone_number: user.phone_number || "",
      },
    };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: { id: string; role: string; phone_number: string };
  }> {
    let payload: { sub: string; phone?: string; role?: string };
    try {
      payload = this.authTokenService.verifyRefreshToken(refreshToken) as {
        sub: string;
        phone?: string;
        role?: string;
      };
    } catch {
      throw new BadRequestException("Invalid refresh token");
    }

    const user = this.prisma
      ? await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: SAFE_USER_SELECT,
        })
      : await this.userRepository.findOne({
          where: { id: payload.sub },
          select: SAFE_TYPEORM_SELECT as any,
        });

    if (!user || !user.hashed_refresh_token) {
      throw new BadRequestException("User not found or refresh token not set");
    }

    const isValid = await bcrypt.compare(
      refreshToken,
      user.hashed_refresh_token,
    );
    if (!isValid) {
      throw new BadRequestException("Refresh token mismatch");
    }

    const tokens = await this.authTokenService.generateTokens(user as any);
    const hashed_refresh_token = await bcrypt.hash(tokens.refresh_token, 12);

    if (this.prisma) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { hashed_refresh_token },
        select: { id: true },
      });
    } else {
      (user as User).hashed_refresh_token = hashed_refresh_token;
      await this.userRepository.save(user as User);
    }

    return {
      ...tokens,
      user: {
        id: user.id,
        role: user.role,
        phone_number: user.phone_number || "",
      },
    };
  }

  async getProfile(userId: string) {
    if (this.prisma) {
      return this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone_number: true,
          email: true,
          full_name: true,
          avatar_url: true,
          role: true,
          wallet_balance: true,
          phone_verified: true,
          auth_provider: true,
          created_at: true,
        },
      });
    }

    return this.userRepository.findOne({
      where: { id: userId },
      select: [
        "id",
        "phone_number",
        "email",
        "full_name",
        "avatar_url",
        "role",
        "wallet_balance",
        "phone_verified",
        "auth_provider",
        "created_at",
      ],
    });
  }

  async updateProfile(
    userId: string,
    data: { full_name?: string; email?: string },
  ) {
    if (this.prisma) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) throw new BadRequestException("User not found");
      const updateData: any = {};
      if (data.full_name !== undefined) updateData.full_name = data.full_name;
      if (data.email !== undefined) updateData.email = data.email;
      if (Object.keys(updateData).length > 0) {
        await this.prisma.user.update({
          where: { id: userId },
          data: updateData,
          select: { id: true },
        });
      }
      return this.getProfile(userId);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id"],
    });
    if (!user) throw new BadRequestException("User not found");
    const update: Partial<User> = {};
    if (data.full_name !== undefined) update.full_name = data.full_name;
    if (data.email !== undefined) update.email = data.email;
    if (Object.keys(update).length > 0) {
      await this.userRepository.update(userId, update);
    }
    return this.getProfile(userId);
  }

  async logFailedLogin(
    identifier: string,
    actorId: string,
    reason: string,
  ): Promise<void> {
    await this.authAuditService.logFailedLogin(identifier, actorId, reason);
  }

  async registerPushToken(
    userId: string,
    token: string,
    platform: "android" | "ios",
  ): Promise<void> {
    const updateField =
      platform === "android" ? { fcm_token: token } : { apns_token: token };
    if (this.prisma) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updateField,
        select: { id: true },
      });
    } else {
      await this.userRepository.update(userId, updateField);
    }
  }
}
