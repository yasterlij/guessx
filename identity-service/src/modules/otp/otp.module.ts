import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}