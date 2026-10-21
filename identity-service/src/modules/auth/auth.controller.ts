import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import * as crypto from "crypto";
import { Redis } from "ioredis";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterPushTokenDto } from "./dto/register-push-token.dto";
import { SuperAppLoginDto } from "./dto/super-app-login.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { SuperAppRegistry } from "./adapters/super-app-registry";
import { JwtAuthGuard } from "../common/jwt-auth.guard";

const LOGIN_RATE_LIMIT_WINDOW_MS = 60000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private superAppRegistry: SuperAppRegistry,
    @Inject("REDIS_CLIENT") private redis: Redis,
  ) {}

  private async checkLoginRateLimit(identifier: string): Promise<void> {
    const key = `login:ratelimit:${identifier}`;
    const attempts = await this.redis.incr(key);
    if (attempts === 1) {
      await this.redis.pexpire(key, LOGIN_RATE_LIMIT_WINDOW_MS);
    } else {
      const ttl = await this.redis.pttl(key);
      if (ttl === -1) {
        await this.redis.pexpire(key, LOGIN_RATE_LIMIT_WINDOW_MS);
      }
    }
    if (attempts > LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
      throw new HttpException(
        "Too many login attempts. Please wait before trying again.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login/email")
  async loginWithEmail(@Body() dto: LoginDto) {
    if (!dto.email || !dto.password) {
      throw new UnauthorizedException("Email and password required");
    }
    await this.checkLoginRateLimit(dto.email);
    const user = await this.authService.validateLocalUser(
      dto.email,
      dto.password,
    );
    if (!user) {
      await this.authService.logFailedLogin(
        dto.email,
        dto.email,
        "invalid_credentials",
      );
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.authService.login(user);
  }

  @Post("login/phone")
  async loginWithPhone(@Body() dto: LoginDto) {
    if (!dto.phone_number || !dto.password) {
      throw new UnauthorizedException("Phone number and password required");
    }
    await this.checkLoginRateLimit(dto.phone_number);
    const user = await this.authService.validateLocalUserByPhone(
      dto.phone_number,
      dto.password,
    );
    if (!user) {
      await this.authService.logFailedLogin(
        dto.phone_number,
        dto.phone_number,
        "invalid_credentials",
      );
      throw new UnauthorizedException("Invalid phone number or password");
    }
    return this.authService.login(user);
  }

  @Post("login/telebirr")
  async loginWithTeleBirr(@Body() dto: LoginDto) {
    if (!dto.access_token || !dto.phone_number) {
      throw new UnauthorizedException(
        "Access token and phone number required",
      );
    }
    const user = await this.authService.validateTeleBirrUser(
      dto.access_token,
      dto.phone_number,
    );
    return this.authService.login(user);
  }

  @Post("login/banking")
  async loginWithBanking(@Body() dto: LoginDto) {
    if (!dto.access_token || !dto.phone_number) {
      throw new UnauthorizedException(
        "Access token and phone number required",
      );
    }
    const user = await this.authService.validateBankingUser(
      dto.access_token,
      dto.phone_number,
    );
    return this.authService.login(user);
  }

  @Post("login/super-app/:provider")
  async loginWithSuperApp(
    @Param("provider") provider: string,
    @Body() dto: SuperAppLoginDto,
  ) {
    const user = await this.authService.validateSuperAppUser(
      provider,
      dto.code,
      dto.redirect_uri,
    );
    return this.authService.login(user);
  }

  @Get("super-app/:provider/authorize")
  getSuperAppAuthorizationUrl(
    @Param("provider") provider: string,
    @Query("state") state: string,
  ) {
    const adapter = this.superAppRegistry.get(provider);
    return {
      url: adapter.getAuthorizationUrl(
        state || crypto.randomBytes(16).toString("hex"),
      ),
    };
  }

  @Post("refresh")
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  async getProfile(@Req() req: { user: { id: string; role?: string } }) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("profile")
  async updateProfile(@Req() req: { user: { id: string; role?: string } }, @Body() data: UpdateProfileDto) {
    const user = await this.authService.updateProfile(req.user.id, data);
    if (!user) {
      return { id: req.user.id, full_name: data.full_name, email: data.email };
    }
    return { id: user.id, full_name: user.full_name, email: user.email };
  }

  @UseGuards(JwtAuthGuard)
  @Post("fcm-token")
  async registerFcmToken(@Req() req: { user: { id: string; role?: string } }, @Body() dto: RegisterPushTokenDto) {
    await this.authService.registerPushToken(
      req.user.id,
      dto.token,
      dto.platform,
    );
    return { registered: true };
  }
}
