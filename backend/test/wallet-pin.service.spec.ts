import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { WalletPinService } from "../src/modules/wallet/wallet-pin.service";
import { User } from "../src/modules/auth/entities/user.entity";

function createMockRepo() {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
  };
}

describe("WalletPinService", () => {
  let service: WalletPinService;
  let mockUserRepo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    mockUserRepo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletPinService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<WalletPinService>(WalletPinService);
  });

  it("sets a wallet PIN hash for a valid PIN", async () => {
    const user = { id: "user-1", wallet_pin_hash: null };
    mockUserRepo.findOne.mockResolvedValue(user);
    mockUserRepo.save.mockImplementation(async (value) => value);

    await service.setPin("user-1", "1234");

    expect(mockUserRepo.save).toHaveBeenCalled();
    const savedUser = mockUserRepo.save.mock.calls[0][0];
    expect(savedUser.wallet_pin_hash).toBeTruthy();
    expect(savedUser.wallet_pin_hash).not.toBe("1234");
  });

  it("locks the PIN after the max number of failed attempts", async () => {
    mockUserRepo.findOne
      .mockResolvedValueOnce({
        id: "user-1",
        wallet_pin_hash:
          "$2a$10$hWH5vW8wM0tKQlASt1C2UeGW8Tn7n6IY0EjhWk1mBzQ0q0i8Y0V0C",
        pin_attempts: 4,
        pin_locked_until: null,
      })
      .mockResolvedValueOnce({
        pin_attempts: 5,
        pin_locked_until: null,
      });

    const result = await service.verifyPin("user-1", "0000");

    expect(mockUserRepo.increment).toHaveBeenCalledWith(
      { id: "user-1" },
      "pin_attempts",
      1,
    );
    expect(mockUserRepo.update).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ pin_locked_until: expect.any(Date) }),
    );
    expect(result.valid).toBe(false);
    expect(result.locked).toBe(true);
    expect(result.attemptsRemaining).toBe(0);
  });

  it("resets attempts after a successful verification", async () => {
    const validHash = await bcrypt.hash("1234", 10);
    mockUserRepo.findOne.mockResolvedValue({
      id: "user-1",
      wallet_pin_hash: validHash,
      pin_attempts: 2,
      pin_locked_until: null,
    });

    const result = await service.verifyPin("user-1", "1234");

    expect(mockUserRepo.update).toHaveBeenCalledWith("user-1", {
      pin_attempts: 0,
      pin_locked_until: null,
    });
    expect(result).toEqual({
      valid: true,
      attemptsRemaining: 5,
      locked: false,
      lockedUntil: null,
    });
  });
});
