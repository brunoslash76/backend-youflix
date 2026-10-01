import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { Queue } from "bullmq";
import { TOKEN_CLEANUP_JOB, TOKEN_CLEANUP_QUEUE, TOKEN_CLEANUP_SCHEDULER_ID } from "./token-cleanup.constants";

@Injectable()
export class TokenCleanupScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(TokenCleanupScheduler.name);

  constructor(
    @InjectQueue(TOKEN_CLEANUP_QUEUE)
    private readonly queue: Queue,
  ) { }

  async onApplicationBootstrap() {
    try {
      await this.queue.upsertJobScheduler(
        TOKEN_CLEANUP_SCHEDULER_ID,
        { pattern: '0 3 * * *', tz: 'America/Sao_Paulo' },
        {
          name: TOKEN_CLEANUP_JOB,
          opts: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 60_000 },
            removeOnComplete: { count: 30 },
            removeOnFail: { count: 100 },
          }
        }
      )
      this.logger.log('Token cleanup scheduled daily at 03:00 (America/Sao_Paulo)');

    } catch (error) {
      this.logger.error('Error scheduling token cleanup', error);
      throw error;
    }
  }
}
