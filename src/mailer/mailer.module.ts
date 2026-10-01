import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

@Module({
  providers: [MailerService],
  exports: [MailerService],
  imports: [
    BullModule.registerQueue({
      name: 'mail-queue',
    })
  ],
})
export class MailerModule {}
