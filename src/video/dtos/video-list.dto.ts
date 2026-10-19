import { ApiProperty } from "@nestjs/swagger";
import { VideoListItemDto } from "./video-list-item.dto.js";

export class VideoListResponseDto {
  @ApiProperty({ example: true })
  personalized: boolean;
  @ApiProperty({ type: [VideoListItemDto] })
  items: VideoListItemDto[];
  @ApiProperty({ example: 42 })
  total: number;
  @ApiProperty({ example: 1 })
  page: number;
  @ApiProperty({ example: 20 })
  limit: number;
}