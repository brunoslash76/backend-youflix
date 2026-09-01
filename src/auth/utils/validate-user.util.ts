import { InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from 'bcrypt';
import { Repository } from "typeorm";
import { User } from "../../user/entities/user.entity.js";

interface Credentials {
  email: string;
  password: string;
}

async function validateUser(credentials: Credentials, usersRepository: Repository<User>): Promise<Omit<User, 'password'>> {
  try {
    const { email, password } = credentials;
    const user = await usersRepository.findOne({ where: { email } });
    const message = 'User credentials are incorrect';

    if (!user) throw new UnauthorizedException(message);

    if (!(await bcrypt.compare(password, user.password))) throw new UnauthorizedException(message);

    return user;
  } catch (error: unknown) {
    if (error instanceof UnauthorizedException) throw error;
    throw new InternalServerErrorException('An error occurred while validating the user');
  }
}