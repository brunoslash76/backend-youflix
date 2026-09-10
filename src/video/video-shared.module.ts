import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Genre } from "./entities/genre.entity";
import { VideoRendition } from "./entities/video-rendition.entity";
import { Video } from "./entities/video.entity";
import { StorageService } from "./storage.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Video, VideoRendition, Genre]),
  ],
  providers: [StorageService],
  exports: [StorageService, TypeOrmModule]
})
export class VideoSharedModule {}
