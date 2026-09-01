import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { Repository } from "typeorm";
import { type Mocked } from "vitest";
import { User } from "../user/entities/user.entity";
import { UserService } from "../user/user.service";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";

vi.mock('bcrypt')

describe('AuthService', () => {
  let authService: AuthService;
  let usersRepository: Mocked<Repository<User>>
  let jwtService: Mocked<JwtService>;

  const mockUser: RegisterDto = {
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'Test',
    password: 'test123',
    passwordConfirmation: 'test123',
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
    const mockJwtService = {
      sign: vi.fn().mockReturnValue('mocked-token'),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mocuUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<Mocked<UserService>>(UserService);
    jwtService = module.get<Mocked<JwtService>>(JwtService);
  })

  afterEach(() => {
    vi.clearAllMocks();
  })

  describe('SIGN UP USER', () => {
    const signUpDTO = {
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'Test',
      password: 'test1234',
      confirmPassword: 'test1234',
      phone: '1234567890',
    }

    it('should sign up a user and return a success true', async () => {
      usersService.findByEmail.mockResolvedValue();
    })
  })
})
