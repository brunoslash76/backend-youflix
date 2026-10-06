import { ApiProperty } from "@nestjs/swagger";
import { AuthUserDto } from "../../common/dtos/api-response.dto";

export class PublicUserDto {
  @ApiProperty({ format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: '2026-09-07T14:00:00.000Z' })
  createdAt: Date;
}

export class UserListResponseDto {
  @ApiProperty({ type: [AuthUserDto] })
  items: AuthUserDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;
  
  @ApiProperty({ example: 20 })
  limit: number;
}