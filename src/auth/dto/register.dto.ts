import { IsEmail, IsNotEmpty, IsString, IsStrongPassword, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  email: string;

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
    message: 'Password must contain uppercase, lowercase, and a number',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  passwordConfirmation: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  lastName: string;
}
