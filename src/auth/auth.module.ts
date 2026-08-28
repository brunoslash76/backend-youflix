import { Module } from '@nestjs/common';
import { UserService } from '../user/user.service.js';
import { AuthCustomerService } from './auth.service.js';

@Module({
  providers: [AuthCustomerService],
  exports: [AuthCustomerService],
  imports: [UserService],
})
export class AuthModule {}
