import { ApiProperty } from "@nestjs/swagger";
import { VideoListItemDto } from "./video-list-item.dto";

export class FeedResponseDto {
  @ApiProperty({ example: true })
  personalized: boolean;
  @ApiProperty({ type: [VideoListItemDto] })
  items: VideoListItemDto[];
}
