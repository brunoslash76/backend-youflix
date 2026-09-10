import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MailerService } from './mailer.service';
import { MailProcessor } from './processors/mail.processors';

@Module({
  providers: [MailerService, MailProcessor],
  exports: [MailerService],
  imports: [
    JwtModule,
    BullModule.registerQueue({
      name: 'mail-queue',
    })
  ],
})
export class MailerModule {}
