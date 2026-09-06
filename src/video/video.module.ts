import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Genre } from './entities/genre.entity';
import { Video } from './entities/video.entity';
import { StorageService } from './storage.service';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';

@Module({
  providers: [VideoService, StorageService],
  controllers: [VideoController],
  imports: [TypeOrmModule.forFeature([Video, Genre])],
})
export class VideoModule {}
