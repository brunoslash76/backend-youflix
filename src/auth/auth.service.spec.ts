import { JwtService, TokenExpiredError } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as bcrypt from 'bcrypt';
import { Repository } from "typeorm";
import { type Mocked } from "vitest";
import { MailerService } from "../mailer/mailer.service";
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
    jwt: {
      secret: 'test',
      refreshTokenSecret: 'test',
      accessTokenExpiresIn: 15,
      refreshTokenExpiresIn: 3600,
      activationTokenSecret: 'test-activation',
    },
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
  let mailerService: Mocked<MailerService>;

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
      update: vi.fn().mockResolvedValue({ affected: 1 }),
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
      verify: vi.fn(),
    }
    const mockMailerService = {
      sendAccountActivationEmail: vi.fn().mockResolvedValue(undefined),
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
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersRepository = module.get<Mocked<Repository<User>>>(getRepositoryToken(User));
    jwtService = module.get<Mocked<JwtService>>(JwtService);
    tokensRepository = module.get<Mocked<Repository<Tokens>>>(getRepositoryToken(Tokens));
    mailerService = module.get(MailerService);

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

    const { passwordConfirmation: _confirmation, ...userData } = signUpDTO;
    it('should sign up a user and return a success true', async () => {
      usersRepository.findOneBy.mockResolvedValue(null);
      usersRepository.create.mockImplementation(data => data as User);
      usersRepository.save.mockImplementation(async data => ({ id: 'user-1', ...data }) as User);
      const result = await authService.register(signUpDTO);
      expect(usersRepository.findOneBy).toHaveBeenCalledWith([
        { email: signUpDTO.email },
        { phone: signUpDTO.phone },
      ]);
      expect(bcrypt.hash).toHaveBeenCalledWith(signUpDTO.password, 10);
      expect(usersRepository.create).toHaveBeenCalledWith({
        ...userData,
        password: 'hashed-password',
        isActive: false,
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', purpose: 'account-activation' },
        { secret: 'test-activation', expiresIn: '24h' },
      );
      expect(mailerService.sendAccountActivationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        'mocked-token',
      );
      expect(result).toEqual({ success: true });
    });
    it('should throw an error if the user already exists', async () => {
      usersRepository.findOneBy.mockResolvedValue({ id: 'some-id' } as User);
      await expect(authService.register(signUpDTO)).rejects.toThrow('User already exists');
      expect(usersRepository.findOneBy).toHaveBeenCalledWith([
        { email: signUpDTO.email },
        { phone: signUpDTO.phone },
      ]);
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
    });
    it('should still return success if enqueuing the activation email fails', async () => {
      usersRepository.findOneBy.mockResolvedValue(null);
      usersRepository.create.mockImplementation(data => data as User);
      usersRepository.save.mockImplementation(async data => ({ id: 'user-1', ...data }) as User);
      mailerService.sendAccountActivationEmail.mockRejectedValueOnce(new Error('redis down'));
      const result = await authService.register(signUpDTO);
      expect(usersRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

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

  describe('ACTIVATE ACCOUNT', () => {
    const token = 'activation-jwt'
    const inactiveUser = {
      id: 'user-1',
      email: 'test@test.com',
      isActive: false,
    } as User;

    it('should activate an inactive user and return success', async () => {
      jwtService.verify.mockReturnValue({
        sub: inactiveUser.id,
        purpose: 'account-activation',
      })

      usersRepository.findOneBy.mockResolvedValue(inactiveUser)
      const result = await authService.activateAccount(token)

      expect(jwtService.verify).toHaveBeenCalledWith(token, { secret: 'test-activation' })
      expect(usersRepository.findOneBy).toHaveBeenCalledWith({ id: inactiveUser.id })
      expect(usersRepository.update).toHaveBeenCalledWith(inactiveUser.id, { isActive: true })
      expect(result).toEqual({ success: true })
    })

    it('should return success without updating if the account is already active', async () => {
      jwtService.verify.mockReturnValue({
        sub: inactiveUser.id,
        purpose: 'account-activation',
      })

      usersRepository.findOneBy.mockResolvedValue({ ...inactiveUser, isActive: true } as User)

      const result = await authService.activateAccount(token)
      expect(usersRepository.findOneBy).toHaveBeenCalledWith({ id: inactiveUser.id })
      expect(usersRepository.update).not.toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })

    it('should throw if the token purpose is not account-activation', async () => {
      jwtService.verify.mockReturnValue({
        sub: inactiveUser.id,
        purpose: 'access',
      })

      await expect(authService.activateAccount(token)).rejects.toThrow('Invalid activation token')
      expect(usersRepository.findOneBy).not.toHaveBeenCalled()
      expect(usersRepository.update).not.toHaveBeenCalled()
    })

    it('should throw a specific error if the token is expired', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new TokenExpiredError('jwt expired', new Date());
      });
      await expect(authService.activateAccount(token)).rejects.toThrow('Activation token expired');
      expect(usersRepository.findOneBy).not.toHaveBeenCalled();
    });
    
    it('should throw if the token is malformed or has a bad signature', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });
      await expect(authService.activateAccount(token)).rejects.toThrow('Invalid activation token');
      expect(usersRepository.findOneBy).not.toHaveBeenCalled();
    });
  })

  describe('RESEND ACTIVATION', () => {
    const email = 'test@test.com';

    it('should send an email when the user exists and is inactive', async () => {
      const inactiveUser = { id: 'user-1', email, isActive: false } as User;
      usersRepository.findOneBy.mockResolvedValue(inactiveUser);

      const result = await authService.resendActivation(email);

      expect(usersRepository.findOneBy).toHaveBeenCalledWith({ email });
      expect(mailerService.sendAccountActivationEmail).toHaveBeenCalledWith(inactiveUser, 'mocked-token');
      expect(result).toEqual({ success: true });
    });

    it('should not send an email when the user does not exist', async () => {
      usersRepository.findOneBy.mockResolvedValue(null);

      const result = await authService.resendActivation(email);

      expect(mailerService.sendAccountActivationEmail).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should not send an email when the user is already active', async () => {
      usersRepository.findOneBy.mockResolvedValue({ id: 'user-1', email, isActive: true } as User);

      const result = await authService.resendActivation(email);

      expect(mailerService.sendAccountActivationEmail).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });
})
