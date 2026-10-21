import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { SmsReminderService } from './sms-reminder.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [NotificationController],
  providers: [NotificationService, SmsReminderService],
  exports: [NotificationService],
})
export class NotificationModule {}
