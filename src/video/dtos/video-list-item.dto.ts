import { ApiProperty } from "@nestjs/swagger";
import { Genre } from "../entities/genre.entity";

export class VideoListItemDto {
  @ApiProperty({ example: 'V1StGXR8_Z5jdHi6B' })
  publicId: string;
  @ApiProperty({ example: 'My First Video' })
  title: string;
  @ApiProperty({ type: [Genre] })
  genres: Genre[];
  @ApiProperty({ example: 1024 })
  views: number;
  @ApiProperty({ example: '2026-09-07T14:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ nullable: true, example: 'https://cdn.example.com/thumb.jpg' })
  thumbnailUrl: string | null;
}