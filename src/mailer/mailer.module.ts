import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MailerService } from './mailer.service';

@Module({
  providers: [MailerService],
  exports: [MailerService],
  imports: [
    JwtModule,
    BullModule.registerQueue({
      name: 'mail-queue',
    })
  ],
})
export class MailerModule {}
