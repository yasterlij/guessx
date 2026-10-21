import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { OtpService } from './otp.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('otp')
@Controller('otp')
export class OtpController {
  constructor(private otpService: OtpService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP' })
  async sendOtp(@Body('phone_number') phoneNumber: string) {
    return this.otpService.generateOtp(phoneNumber);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP' })
  async verifyOtp(
    @Body('phone_number') phoneNumber: string,
    @Body('code') code: string,
  ) {
    await this.otpService.verifyOtp(phoneNumber, code);
    return { verified: true };
  }
}
