import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { config } from '../config';
import { User } from '../user/entities/user.entity';

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: true,
}

@Injectable()
export class MailerService {
  constructor(
    @InjectQueue('mail-queue')
    private readonly mailerQueue: Queue,
  ) { }

  async sendAccountActivationEmail(user: User, token: string) {
    await this.mailerQueue.add(
      'send-email',
      {
        to: user.email,
        subject: 'Account Activation',
        template: 'account-activation',
        variables: {
          name: user.firstName + ' ' + user.lastName,
          url: this.buildFrontendUrl('/activate', token),
        }
      },
      DEFAULT_JOB_OPTIONS,
    )
  }

  async sendPasswordResetEmail(user: User, token: string) {
    await this.mailerQueue.add(
      'send-email',
      {
        to: user.email,
        subject: 'Password Reset',
        template: 'password-reset',
        variables: {
          name: user.firstName + ' ' + user.lastName,
          url: this.buildFrontendUrl('/reset-password', token),
        }
      },
      DEFAULT_JOB_OPTIONS,
    )
  }

  private buildFrontendUrl(path: string, token: string): string {
    const url = new URL(path, config.frontendUrl)
    url.searchParams.set('token', token);
    return url.toString();
  }
}
