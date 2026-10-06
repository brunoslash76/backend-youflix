import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { type Mocked } from 'vitest';
import { Tokens } from '../auth/entities/tokens.entity.js';
import { User } from './entities/user.entity.js';
import { UserService } from './user.service.js';

describe('UserService', () => {
  let service: UserService;
  let usersRepository: Mocked<Repository<User>>;
  let tokensRepository: Mocked<Repository<Tokens>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: vi.fn(),
            findOneBy: vi.fn(),
            findAndCount: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            createQueryBuilder: vi.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tokens),
          useValue: { update: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    usersRepository = module.get(getRepositoryToken(User));
    tokensRepository = module.get(getRepositoryToken(Tokens));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a public profile for an active user', async () => {
    const user = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date('2026-09-07T14:00:00.000Z'),
    };
    usersRepository.findOne.mockResolvedValue(user as User);

    await expect(service.findPublicById(user.id)).resolves.toEqual(user);
  });

  it('should throw when the public profile does not exist', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.findPublicById('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
      'User not found',
    );
  });

  it('should revoke every session when an account is deleted', async () => {
    usersRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

    await expect(service.deleteAccount('user-id')).resolves.toEqual({ success: true });
    expect(tokensRepository.update).toHaveBeenCalledWith(
      { userId: 'user-id' },
      { isRevoked: true, isUsed: true },
    );
  });

  it('should refuse to delete your own account through the admin route', async () => {
    await expect(service.adminDeleteUser('same-id', 'same-id')).rejects.toThrow(
      'Use DELETE /user/me to delete your own account',
    );
    expect(usersRepository.delete).not.toHaveBeenCalled();
  });
});
