import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { Tokens } from "../entities/tokens.entity";
import { TOKEN_CLEANUP_QUEUE } from "./token-cleanup.constants";

@Processor(TOKEN_CLEANUP_QUEUE)
export class TokenCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(TokenCleanupProcessor.name);

  constructor(
    @InjectRepository(Tokens)
    private readonly tokensRepository: Repository<Tokens>
  ) {
    super();
  }

  async process(): Promise<{ deleted: number }> {
    try {
      const result = await this.tokensRepository.delete({
        expiresAt: LessThan(new Date())
      })
      const deleted = result.affected ?? 0;

      this.logger.log(`Deleted ${deleted} expired tokens`);

      return { deleted };
    } catch(error) {
      this.logger.error('Error deleting expired tokens', error);
      throw error;
    }
  }
}