import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Tokens } from '../auth/entities/tokens.entity';
import { AdminUpdateUserDto } from './dto/admin-update.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Tokens)
    private readonly tokensRepository: Repository<Tokens>,
  ) { }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    try {
      if (Object.keys(dto).length === 0) throw new BadRequestException('No fields to update')

      if (dto.phone) {
        const existing = await this.usersRepository.findOneBy({ phone: dto.phone })
        if (existing && existing.id !== userId) throw new ConflictException('Phone already in use')
      }

      await this.usersRepository.update(userId, dto);
      const user = await this.usersRepository.findOneBy({ id: userId });

      if (!user) throw new NotFoundException('User not found')
      const { password: _password, refreshToken: _refreshToken, ...userData } = user;
      return { success: true, data: userData }
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      console.error(String(error));
      throw new InternalServerErrorException('An error occurred while updating the profile');
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    try {
      const user = await this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.id = :id', { id: userId })
        .getOne();

      if (!user) throw new NotFoundException('user not found');

      const isValid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isValid) throw new UnauthorizedException('Current password is incorrect');

      if (dto.currentPassword === dto.newPassword) throw new BadRequestException('New password cannot be the same as the current password');

      const encryptedPassword = await bcrypt.hash(dto.newPassword, 10);
      await this.usersRepository.update(userId, { password: encryptedPassword });
      await this.revokeAllSessions(userId);

      return { success: true }
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      console.error(String(error));
      throw new InternalServerErrorException('An error occurred while changing the password');
    }
  }

  async deleteAccount(userId: string) {
    try {
      await this.revokeAllSessions(userId);
      const result = await this.usersRepository.delete(userId);
      if (!result.affected) throw new NotFoundException('User not found');
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      console.error(String(error));
      throw new InternalServerErrorException('An error occurred while deleting the account');
    }
  }

  async findPublicById(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true },
      select: { id: true, firstName: true, lastName: true, createdAt: true },
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async listUsers(page = 1, limit = 20) {
    const [items, total] = await this.usersRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async adminUpdateUser(id: string, dto: AdminUpdateUserDto) {
    try {
      if (Object.keys(dto).length === 0) throw new BadRequestException('No fields to update');

      await this.usersRepository.update(id, dto);

      const user = await this.usersRepository.findOneBy({ id });

      if (!user) throw new NotFoundException('User not found');
      if (dto.isActive === false) await this.revokeAllSessions(id);

      return { success: true, data: user };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      console.error(String(error));
      throw new InternalServerErrorException('An error occurred while updating the user');
    }
  }

  async adminDeleteUser(id: string, requesterId: string) {
    if (id === requesterId) throw new BadRequestException('Use DELETE /user/me to delete your own account');
    
    return this.deleteAccount(id);
  }

  private async revokeAllSessions(userId: string) {
    await this.tokensRepository.update({ userId }, { isRevoked: true, isUsed: true });
  }

  async validateUsername(username: string): Promise<{ success: boolean }> {
    try {
      const existing = await this.usersRepository.findOneBy({ username })
      if (existing) throw new ConflictException('Username already in use')
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      console.error(String(error));
      throw new InternalServerErrorException('An error occurred while validating the username');
    }
  }
}
