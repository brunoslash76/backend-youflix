import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tokens } from "../entities/tokens.entity";
import { TOKEN_CLEANUP_QUEUE } from "./token-cleanup.constants";
import { TokenCleanupProcessor } from "./token-cleanup.processor";
import { TokenCleanupScheduler } from "./token-cleanup.scheduler";

@Module({
  imports: [
    TypeOrmModule.forFeature([Tokens]),
    BullModule.registerQueue({
      name: TOKEN_CLEANUP_QUEUE
    })
  ],
  providers: [TokenCleanupProcessor, TokenCleanupScheduler]
})
export class TokenCleanupModule { }