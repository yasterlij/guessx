import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { Redis } from "ioredis";
import { PrismaService } from "../../prisma/prisma.service";
import { User } from "../auth/entities/user.entity";

@Injectable()
export class WalletPinService {
  private readonly MAX_PIN_ATTEMPTS = 5;
  private readonly PIN_LOCKOUT_MINUTES = 5;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Optional()
    private prisma?: PrismaService,
    @Optional()
    @Inject("REDIS_CLIENT")
    private redis?: Redis,
  ) {}

  async setPin(userId: string, pin: string): Promise<void> {
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      throw new BadRequestException("PIN must be 4–6 digits");
    }
    const hash = await bcrypt.hash(pin, 10);

    if (this.prisma) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) throw new NotFoundException("User not found");
      await this.prisma.user.update({
        where: { id: userId },
        data: { wallet_pin_hash: hash },
        select: { id: true },
      });
      return;
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "wallet_pin_hash"],
    });
    if (!user) throw new NotFoundException("User not found");
    user.wallet_pin_hash = hash;
    await this.userRepository.save(user);
  }

  async verifyPin(
    userId: string,
    pin: string,
  ): Promise<{
    valid: boolean;
    attemptsRemaining: number;
    locked: boolean;
    lockedUntil: Date | null;
  }> {
    if (this.prisma) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          wallet_pin_hash: true,
          pin_attempts: true,
          pin_locked_until: true,
        },
      });
      if (!user) throw new NotFoundException("User not found");
      if (!user.wallet_pin_hash) {
        throw new BadRequestException("Wallet PIN not set");
      }

      if (user.pin_locked_until && user.pin_locked_until > new Date()) {
        return {
          valid: false,
          attemptsRemaining: 0,
          locked: true,
          lockedUntil: user.pin_locked_until,
        };
      }

      if (user.pin_locked_until && user.pin_locked_until <= new Date()) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            pin_attempts: 0,
            pin_locked_until: null,
          },
          select: { id: true },
        });
        user.pin_attempts = 0;
      }

      const valid = await bcrypt.compare(pin, user.wallet_pin_hash);

      if (!valid) {
        const newAttempts = (user.pin_attempts || 0) + 1;
        const locked = newAttempts >= this.MAX_PIN_ATTEMPTS;
        const lockedUntil = locked
          ? new Date(Date.now() + this.PIN_LOCKOUT_MINUTES * 60 * 1000)
          : null;

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            pin_attempts: newAttempts,
            pin_locked_until: lockedUntil,
          },
          select: { id: true },
        });

        const attemptsRemaining = locked
          ? 0
          : Math.max(0, this.MAX_PIN_ATTEMPTS - newAttempts);
        return { valid: false, attemptsRemaining, locked, lockedUntil };
      }

      if ((user.pin_attempts || 0) > 0 || user.pin_locked_until) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            pin_attempts: 0,
            pin_locked_until: null,
          },
          select: { id: true },
        });
      }

      if (this.redis && typeof this.redis.set === "function") {
        await this.redis.set(
          `guessx:wallet:pin-verified:${userId}`,
          "1",
          "EX",
          300,
        );
      }

      return {
        valid: true,
        attemptsRemaining: this.MAX_PIN_ATTEMPTS,
        locked: false,
        lockedUntil: null,
      };
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "wallet_pin_hash", "pin_attempts", "pin_locked_until"],
    });
    if (!user) throw new NotFoundException("User not found");
    if (!user.wallet_pin_hash) {
      throw new BadRequestException("Wallet PIN not set");
    }

    if (user.pin_locked_until && user.pin_locked_until > new Date()) {
      return {
        valid: false,
        attemptsRemaining: 0,
        locked: true,
        lockedUntil: user.pin_locked_until,
      };
    }

    if (user.pin_locked_until && user.pin_locked_until <= new Date()) {
      await this.userRepository.update(user.id, {
        pin_attempts: 0,
        pin_locked_until: null as any,
      });
      user.pin_attempts = 0;
    }

    const valid = await bcrypt.compare(pin, user.wallet_pin_hash);

    if (!valid) {
      await this.userRepository.increment({ id: userId }, "pin_attempts", 1);
      const updated = await this.userRepository.findOne({
        where: { id: userId },
        select: ["pin_attempts", "pin_locked_until"],
      });
      const newAttempts = updated?.pin_attempts ?? 1;
      const locked = newAttempts >= this.MAX_PIN_ATTEMPTS;
      const lockedUntil = locked
        ? new Date(Date.now() + this.PIN_LOCKOUT_MINUTES * 60 * 1000)
        : null;

      if (locked) {
        await this.userRepository.update(user.id, {
          pin_locked_until: lockedUntil as any,
        });
      }

      const attemptsRemaining = locked
        ? 0
        : Math.max(0, this.MAX_PIN_ATTEMPTS - newAttempts);
      return { valid: false, attemptsRemaining, locked, lockedUntil };
    }

    if ((user.pin_attempts || 0) > 0 || user.pin_locked_until) {
      await this.userRepository.update(user.id, {
        pin_attempts: 0,
        pin_locked_until: null as any,
      });
    }

    if (this.redis && typeof this.redis.set === "function") {
      await this.redis.set(
        `guessx:wallet:pin-verified:${userId}`,
        "1",
        "EX",
        300,
      );
    }

    return {
      valid: true,
      attemptsRemaining: this.MAX_PIN_ATTEMPTS,
      locked: false,
      lockedUntil: null,
    };
  }

  async getPinStatus(
    userId: string,
  ): Promise<{
    hasPin: boolean;
    attemptsRemaining: number;
    locked: boolean;
    lockedUntil: Date | null;
  }> {
    if (this.prisma) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          wallet_pin_hash: true,
          pin_attempts: true,
          pin_locked_until: true,
        },
      });
      if (!user) throw new NotFoundException("User not found");

      const locked = !!(
        user.pin_locked_until && user.pin_locked_until > new Date()
      );
      const attemptsRemaining = Math.max(
        0,
        this.MAX_PIN_ATTEMPTS - (user.pin_attempts || 0),
      );

      return {
        hasPin: user.wallet_pin_hash !== null,
        attemptsRemaining: locked ? 0 : attemptsRemaining,
        locked,
        lockedUntil: locked ? user.pin_locked_until : null,
      };
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "wallet_pin_hash", "pin_attempts", "pin_locked_until"],
    });
    if (!user) throw new NotFoundException("User not found");

    const locked = !!(
      user.pin_locked_until && user.pin_locked_until > new Date()
    );
    const attemptsRemaining = Math.max(
      0,
      this.MAX_PIN_ATTEMPTS - (user.pin_attempts || 0),
    );

    return {
      hasPin: user.wallet_pin_hash !== null,
      attemptsRemaining: locked ? 0 : attemptsRemaining,
      locked,
      lockedUntil: locked ? user.pin_locked_until : null,
    };
  }

  async hasPin(userId: string): Promise<boolean> {
    if (this.prisma) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { wallet_pin_hash: true },
      });
      if (!user) throw new NotFoundException("User not found");
      return user.wallet_pin_hash !== null;
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "wallet_pin_hash"],
    });
    if (!user) throw new NotFoundException("User not found");
    return user.wallet_pin_hash !== null;
  }
}
