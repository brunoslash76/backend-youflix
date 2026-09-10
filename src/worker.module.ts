import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { config } from "./config";
import { ENTITIES } from "./config/entities";
import { typeormConfig } from "./config/typeorm.config";
import { MailProcessingModule } from "./mailer/mail-processing.module";
import { ObserveModule } from "./observe";
import { VideoProcessingModule } from "./video/video-processing.module";

@Module({
  imports: [
    TypeOrmModule.forRoot(
      typeormConfig(ENTITIES, { synchronize: false }),
    ),
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY!,
      appSecret: process.env.OBSERVE_APP_SECRET!,
      serviceId: 'backend-worker',
    }),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
        },
      }),
    }),
    VideoProcessingModule,
    MailProcessingModule,
  ],
})
export class WorkerModule { }