import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { Tokens } from './auth/entities/tokens.entity.js';
import { config } from './config/index.js';
import { typeormConfig } from './config/typeorm.config.js';
import { MailerModule } from './mailer/mailer.module';
import { User } from './user/entities/user.entity.js';
import { UserModule } from './user/user.module.js';
import { Comment } from './video/entities/comments.entity.js';
import { Genre } from './video/entities/genre.entity.js';
import { Video } from './video/entities/video.entity.js';
import { VideoModule } from './video/video.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    TypeOrmModule.forRoot(typeormConfig([User, Tokens, Video, Genre, Comment])),
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
