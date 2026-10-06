import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsStrongPassword, MaxLength, MinLength } from "class-validator";
export class ChangePasswordDto {
  @ApiProperty({ format: 'password', example: 'OldPassword123!' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ format: 'password', example: 'NewPassword123!', minLength: 8, maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1 },
    { message: 'Password must contain uppercase, lowercase, special character and a number' },
  )
  newPassword: string;
}