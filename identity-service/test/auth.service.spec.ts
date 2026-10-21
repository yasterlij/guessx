import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { AuthService } from "../src/modules/auth/auth.service";
import { User, UserRole } from "../src/modules/auth/entities/user.entity";
import { SuperAppRegistry } from "../src/modules/auth/adapters/super-app-registry";
import { AuthTokenService } from "../src/modules/auth/auth-token.service";
import { AuthAuditService } from "../src/modules/auth/auth-audit.service";

function createMockRepo() {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value) => value),
    update: jest.fn(),
  };
}

describe("AuthService", () => {
  let service: AuthService;
  let mockUserRepo: ReturnType<typeof createMockRepo>;
  let mockTokenService: {
    generateTokens: jest.Mock;
    verifyRefreshToken: jest.Mock;
  };
  let mockAuditService: { logFailedLogin: jest.Mock };

  beforeEach(async () => {
    mockUserRepo = createMockRepo();
    mockTokenService = {
      generateTokens: jest
        .fn()
        .mockResolvedValue({
          access_token: "access",
          refresh_token: "refresh",
        }),
      verifyRefreshToken: jest.fn(),
    };
    mockAuditService = {
      logFailedLogin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: SuperAppRegistry, useValue: { get: jest.fn() } },
        { provide: AuthTokenService, useValue: mockTokenService },
        { provide: AuthAuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("registers a new local user and stores a hashed refresh token", async () => {
    mockUserRepo.findOne.mockResolvedValue(null);
    mockUserRepo.save
      .mockResolvedValueOnce({
        id: "user-1",
        phone_number: "0911000000",
        role: UserRole.USER,
        wallet_balance: 0,
      })
      .mockResolvedValueOnce({
        id: "user-1",
        phone_number: "0911000000",
        role: UserRole.USER,
        wallet_balance: 0,
        hashed_refresh_token: "hashed-refresh",
      });

    const result = await service.register({
      phone_number: "0911000000",
      full_name: "Test User",
      password: "password123",
    });

    expect(mockTokenService.generateTokens).toHaveBeenCalled();
    expect(mockUserRepo.save).toHaveBeenCalledTimes(2);
    expect(result.access_token).toBe("access");
    expect(result.refresh_token).toBe("refresh");
  });

  it("rotates refresh tokens for a valid refresh request", async () => {
    const hashedRefresh = await bcrypt.hash("refresh-token", 10);
    mockTokenService.verifyRefreshToken.mockReturnValue({ sub: "user-1" });
    mockUserRepo.findOne.mockResolvedValue({
      id: "user-1",
      phone_number: "0911000000",
      role: UserRole.USER,
      wallet_balance: 50,
      hashed_refresh_token: hashedRefresh,
    });

    const result = await service.refreshToken("refresh-token");

    expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(
      "refresh-token",
    );
    expect(mockTokenService.generateTokens).toHaveBeenCalled();
    expect(result.access_token).toBe("access");
    expect(result.refresh_token).toBe("refresh");
  });

  it("delegates failed login audit logging", async () => {
    await service.logFailedLogin(
      "0911000000",
      "0911000000",
      "invalid_credentials",
    );

    expect(mockAuditService.logFailedLogin).toHaveBeenCalledWith(
      "0911000000",
      "0911000000",
      "invalid_credentials",
    );
  });
});
