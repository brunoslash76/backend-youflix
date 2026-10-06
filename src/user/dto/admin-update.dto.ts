import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ example: true, description: 'Activate or deactivate the account' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Grant or revoke admin privileges' })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}