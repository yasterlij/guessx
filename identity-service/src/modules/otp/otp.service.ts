import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly MAX_VERIFY_ATTEMPTS = 5;

  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  async generateOtp(phoneNumber: string): Promise<{ expires_in: number }> {
    const rateKey = `otp:rate:${phoneNumber}`;
    const attempts = await this.redis.incr(rateKey);
    if (attempts === 1) await this.redis.pexpire(rateKey, 60000);
    if (attempts > 3) throw new BadRequestException('Too many OTP requests. Wait 60 seconds.');

    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const existing = await this.prisma.otp.findUnique({ where: { phone_number: phoneNumber } });
    if (existing) {
      await this.prisma.otp.update({ where: { phone_number: phoneNumber }, data: { code, expires_at: expiresAt, verified: false } });
    } else {
      await this.prisma.otp.create({ data: { phone_number: phoneNumber, code, expires_at: expiresAt, verified: false } });
    }

    this.logger.log(`OTP generated for ${phoneNumber.replace(/\d(?=\d{2})/g, '*')}`);
    return { expires_in: 300 };
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const verifyKey = `otp:verify:rate:${phoneNumber}`;
    const attempts = await this.redis.incr(verifyKey);
    if (attempts === 1) await this.redis.pexpire(verifyKey, 5 * 60 * 1000);
    if (attempts > this.MAX_VERIFY_ATTEMPTS) throw new BadRequestException('Too many OTP attempts. Wait 5 minutes.');

    const otp = await this.prisma.otp.findFirst({ where: { phone_number: phoneNumber, verified: false } });
    if (!otp) throw new BadRequestException('Invalid or expired OTP');
    if (new Date() > otp.expires_at) {
      await this.prisma.otp.delete({ where: { id: otp.id } });
      throw new BadRequestException('OTP has expired');
    }
    const bufA = Buffer.from(otp.code);
    const bufB = Buffer.from(code);
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.otp.update({ where: { id: otp.id }, data: { verified: true } });
    await this.redis.del(verifyKey);
    return true;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOtps(): Promise<void> {
    const result = await this.prisma.otp.deleteMany({ where: { expires_at: { lt: new Date() } } });
    if (result.count > 0) this.logger.log(`Cleaned up ${result.count} expired OTPs`);
  }
}