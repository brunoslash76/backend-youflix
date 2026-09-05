import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as bcrypt from 'bcrypt';
import { Repository } from "typeorm";
import { type Mocked } from "vitest";
import { User } from "../user/entities/user.entity";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { Tokens } from "./entities/tokens.entity";

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn().mockResolvedValue(true),
}))

vi.mock('../config/index.js', () => ({
  config: {
    database: { url: 'postgres://test', user: 'u', password: 'p', port: 5432, host: 'localhost', name: 'test' },
    jwt: { secret: 'test', refreshTokenSecret: 'test', accessTokenExpiresIn: 15, refreshTokenExpiresIn: 3600 },
    cookie: { secret: 'test' },
    mailgun: { apiKey: 'test', baseUrl: 'https://api.mailgun.net', domain: 'test.com' },
    frontendUrl: 'http://localhost:3000',
    redis: { host: 'localhost', port: 6379, password: 'test' },
  }
}))

describe('AuthService', () => {
  let authService: AuthService;
  let usersRepository: Mocked<Repository<User>>
  let tokensRepository: Mocked<Repository<Tokens>>;
  let jwtService: Mocked<JwtService>;

  const mockUser: RegisterDto = {
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'Test',
    password: 'Test123',
    passwordConfirmation: 'Test123',
    phone: '1234567890',
  }

  beforeEach(async () => {
    const mockUsersRepository = {
      findOne: vi.fn().mockResolvedValue(mockUser),
      create: vi.fn().mockResolvedValue(mockUser),
      save: vi.fn().mockResolvedValue(mockUser),
      find: vi.fn().mockResolvedValue([mockUser]),
      findOneBy: vi.fn().mockResolvedValue(mockUser),
      findOneOrFail: vi.fn().mockResolvedValue(mockUser),
    }
    const mockTokensRepository = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(null),
      findOneOrFail: vi.fn().mockResolvedValue(null),
    }
    const mockJwtService = {
      sign: vi.fn().mockReturnValue('mocked-token'),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: getRepositoryToken(Tokens),
          useValue: mockTokensRepository,
        }
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersRepository = module.get<Mocked<Repository<User>>>(getRepositoryToken(User));
    jwtService = module.get<Mocked<JwtService>>(JwtService);
    tokensRepository = module.get<Mocked<Repository<Tokens>>>(getRepositoryToken(Tokens));
  })

  afterEach(() => {
    vi.clearAllMocks();
  })

  describe('SIGN UP USER', () => {
    const signUpDTO: RegisterDto = {
      email: 'test1@test.com',
      firstName: 'Test',
      lastName: 'Test',
      password: 'Test1234',
      passwordConfirmation: 'Test1234',
      phone: '1234567890',
    }

    it('should sign up a user and return a success true', async () => {
      usersRepository.findOneBy.mockResolvedValue(null);
      usersRepository.create.mockImplementation(data => data as User);

      const result = await authService.register(signUpDTO);

      expect(usersRepository.findOneBy).toHaveBeenCalledWith({
        email: signUpDTO.email,
        phone: signUpDTO.phone,
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(signUpDTO.password, 10);

      expect(usersRepository.create).toHaveBeenCalledWith({
        ...signUpDTO,
        password: 'hashed-password',
      })

      expect(usersRepository.save).toHaveBeenCalledWith({
        ...signUpDTO,
        password: 'hashed-password',
      })

      expect(result).toEqual({ success: true });
    });

    it('should throw an error if the user already exists', async () => {
      usersRepository.findOneBy.mockResolvedValue({ id: 'some-id' } as User)

      await expect(async () => await authService.register(signUpDTO)).rejects.toThrow('User already exists');

      expect(usersRepository.findOneBy).toHaveBeenCalledWith({
        email: signUpDTO.email,
        phone: signUpDTO.phone,
      });

      expect(bcrypt.hash).not.toHaveBeenCalledWith(signUpDTO.password, 10);

      expect(usersRepository.create).not.toHaveBeenCalledWith({
        ...signUpDTO,
        password: 'hashed-password',
      })

      expect(usersRepository.save).not.toHaveBeenCalledWith({
        ...signUpDTO,
        password: 'hashed-password',
      })
    })

    it('should throw if the password does not match the password confirmation', async () => {
      const signUpDTO: RegisterDto = {
        ...mockUser,
        password: 'Test1234',
        passwordConfirmation: 'Test12345',
      }
      
      await expect(async () => await authService.register(signUpDTO)).rejects.toThrow('Password does not match the password confirmation');
      expect(bcrypt.hash).not.toHaveBeenCalledWith(signUpDTO.password, 10);
      expect(usersRepository.create).not.toHaveBeenCalledWith({
        ...signUpDTO,
        password: 'hashed-password',
      })
      expect(usersRepository.save).not.toHaveBeenCalledWith({
        ...signUpDTO,
        password: 'hashed-password',
      })
    })
  })
})
