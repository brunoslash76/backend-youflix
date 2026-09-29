import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, IsStrongPassword, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({
    example: 'test@example.com',
    minLength: 3,
    maxLength: 255,
    description: 'The email of the user',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'Password123!',
    minLength: 8,
    maxLength: 255,
    description: 'The password of the user',
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
  }, {
    message: 'Password must contain uppercase, lowercase, special character and a number',
  })
  password: string;

  @ApiProperty({
    example: 'Password123!',
    minLength: 8,
    maxLength: 255,
    description: 'The password confirmation of the user',
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  passwordConfirmation: string;

  @ApiProperty({
    example: '+998901234567',
    minLength: 8,
    maxLength: 255,
    description: 'The phone number of the user',
    format: 'phone',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  phone: string;

  @ApiProperty({
    example: 'John',
    minLength: 2,
    maxLength: 255,
    description: 'The first name of the user',
    format: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    minLength: 2,
    maxLength: 255,
    description: 'The last name of the user',
    format: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  lastName: string;
}
