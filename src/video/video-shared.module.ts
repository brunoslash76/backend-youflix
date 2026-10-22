import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Genre } from "./entities/genre.entity";
import { VideoModeration } from "./entities/video-moderation.entity";
import { VideoRendition } from "./entities/video-rendition.entity";
import { Video } from "./entities/video.entity";
import { ModerationActionsService } from "./moderation-actions.service";
import { StorageService } from "./storage.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Video, VideoRendition, Genre, VideoModeration]),
  ],
  providers: [StorageService, ModerationActionsService],
  exports: [StorageService, ModerationActionsService, TypeOrmModule]
})
export class VideoSharedModule {}
