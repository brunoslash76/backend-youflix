import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { ENTITIES } from './config/entities.js';
import { config } from './config/index.js';
import { typeormConfig } from './config/typeorm.config.js';
import { MailerModule } from './mailer/mailer.module';
import { ObserveModule } from './observe.js';
import { UserModule } from './user/user.module.js';
import { VideoModule } from './video/video.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60_000,
      limit: 60,
    }]),
    TypeOrmModule.forRoot(typeormConfig(ENTITIES)),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
        }
      })
    }),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    AuthModule,
    UserModule,
    MailerModule,
    VideoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
