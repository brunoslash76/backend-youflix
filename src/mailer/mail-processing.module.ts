import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { MailProcessor } from "./processors/mail.processors";

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'mail-queue',
    }),
  ],
  providers: [MailProcessor],
})
export class MailProcessingModule { }
