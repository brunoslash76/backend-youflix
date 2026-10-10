import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/constants/redis.constant";
import { HISTORY_TTL_SECONDS, MAX_STORED_TERMS, MAX_SUGGESTIONS } from "./constants/search-history.constants";
import { SearchHistoryEntryDto } from "./dto/search-history-entry.dto";
import { normalizeSearchTerm } from "./utils/normalize-search-term";

@Injectable()
export class SearchHistoryService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) { }

  async record(userId: string, term: string) {
    await this.save(userId, [{ term, searchedAt: Date.now() }])
  }

  async import(userId: string, entries: SearchHistoryEntryDto[]) {
    await this.save(userId, entries)
  }

  async findRecent(userId: string, prefix = '') {
    const normalizedPrefix = normalizeSearchTerm(prefix);
    const terms = await this.redis.zrevrange(this.key(userId), 0, -1);
    return terms.filter(term => term.startsWith(normalizedPrefix)).slice(0, MAX_SUGGESTIONS)
  }

  private async save(userId: string, entries: SearchHistoryEntryDto[]) {
    const now = Date.now();
    const scoreMembers = entries.flatMap(({ term, searchedAt }) => {
      const normalized = normalizeSearchTerm(term)
      return normalized ? [Math.min(searchedAt, now), normalized] : [];
    })

    if (!scoreMembers.length) return;

    const key = this.key(userId);
    await this.redis.multi()
      .zadd(key, 'GT', ...scoreMembers)
      .zremrangebyrank(key, 0, -(MAX_STORED_TERMS + 1))
      .expire(key, HISTORY_TTL_SECONDS)
      .exec();
  }

  private key(userId: string): string {
    return `search-history:${userId}`;
  }
}