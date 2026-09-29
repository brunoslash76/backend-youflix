import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bullmq';
import { config } from '../config';
import { User } from '../user/entities/user.entity';

@Injectable()
export class MailerService {
  constructor(
    @InjectQueue('mail-queue') 
    private readonly mailerQueue: Queue,
    private readonly jwtService: JwtService,
  ) { }

  async sendAccountActivationEmail(user: User) {
    const token = this.jwtService.sign({ id: user.id }, { expiresIn: '1h' });
    const url = `${config.frontendUrl}/activate?token=${token}`;
    await this.mailerQueue.add(
      'send-email',
      {
        to: user.email,
        subject: 'Account Activation',
        template: 'account-activation',
        variables: {
          name: user.firstName + ' ' + user.lastName,
          url,
        }
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      }
    )
  }

  async sendPasswordResetEmail(user: User) {
    const token = this.jwtService.sign({ id: user.id }, { expiresIn: '1h' });
    const url = `${config.frontendUrl}/reset-password?token=${token}`;
    await this.mailerQueue.add(
      'send-email',
      {
        to: user.email,
        subject: 'Password Reset',
        template: 'password-reset',
        variables: {
          name: user.firstName + ' ' + user.lastName,
          url,
        }
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      }
    )
  }
}
