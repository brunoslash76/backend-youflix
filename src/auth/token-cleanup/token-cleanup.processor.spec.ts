import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { type Mocked } from "vitest";
import { Tokens } from "../entities/tokens.entity";
import { TokenCleanupProcessor } from "./token-cleanup.processor";

describe('TokenCleanupProcessor', () => {
  let processor: TokenCleanupProcessor;
  let tokensRepository: Mocked<Repository<Tokens>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TokenCleanupProcessor,
        {
          provide: getRepositoryToken(Tokens),
          useValue: { delete: vi.fn() },
        },
      ],
    }).compile();

    processor = module.get(TokenCleanupProcessor);
    tokensRepository = module.get(getRepositoryToken(Tokens));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delete tokens whose expiresAt is in the past', async () => {
    const now = new Date('2026-10-01T03:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    tokensRepository.delete.mockResolvedValue({ affected: 5, raw: [] });

    const result = await processor.process();

    expect(tokensRepository.delete).toHaveBeenCalledWith({ expiresAt: LessThan(now) });
    expect(result).toEqual({ deleted: 5 });
  });

  it('should report zero when the driver does not return affected rows', async () => {
    tokensRepository.delete.mockResolvedValue({ raw: [] });

    const result = await processor.process();

    expect(result).toEqual({ deleted: 0 });
  });
});