import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

vi.mock('../config/index.js', () => ({
  config: {
    jwt: {
      secret: 'test',
      refreshTokenSecret: 'test',
      accessTokenExpiresIn: 15,
      refreshTokenExpiresIn: 3600,
      activationTokenSecret: 'test-activation',
    },
    cookie: { secret: 'test' },
  },
}));

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            updateProfile: vi.fn(),
            changePassword: vi.fn(),
            deleteAccount: vi.fn(),
            findPublicById: vi.fn(),
            listUsers: vi.fn(),
            adminUpdateUser: vi.fn(),
            adminDeleteUser: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
