import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tokens } from '../auth/entities/tokens.entity.js';
import { User } from './entities/user.entity.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Tokens])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
