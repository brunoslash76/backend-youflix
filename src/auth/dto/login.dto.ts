import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ format: 'email', example: 'john.doe@example.com', minLength: 3, maxLength: 255 })
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  email: string;

  @ApiProperty({ format: 'password', example: 'Password123!', minLength: 8, maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  password: string;
}
