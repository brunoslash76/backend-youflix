import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from 'bcrypt';
import { Repository } from "typeorm";
import { User } from "../user/entities/user.entity.js";

@Injectable()
export class AuthCustomerService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) { }

  async validateUser(email: string, password: string): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.usersRepository.findOne({ where: { email } });
      const message = 'User credentials are incorrect';

      if (!user) throw new UnauthorizedException(message);

      if (!(await bcrypt.compare(password, user.password))) throw new UnauthorizedException(message);

      return user;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('An error occurred while validating the user');
    }
  }

  async registerUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<Omit<User, 'password'>> {
    try {
      const encryptedPassword = await bcrypt.hash(user.password, 10);
      const newUser = this.usersRepository.create({ ...user, password: encryptedPassword });
      return await this.usersRepository.save(newUser);
    } catch (error: unknown) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException('An error occurred while registering the user');
    }
  }
}
