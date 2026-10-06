import { ApiProperty } from "@nestjs/swagger";

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ 
    description: 'A single message, or a list when validation fails',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }}],
    example: ['Email must be and email'],
  })
  message: string | string[];

  @ApiProperty({ example: 'Bad Request'})
  error: string;
}

export class AuthUserDto {
  @ApiProperty({ format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Jhon' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ format: 'email', example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: '+5511999999999' })
  phone: string;

  @ApiProperty({ example: false })
  isAdmin: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-09-07T14:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-07T14:00:00.000Z' })
  updatedAt: Date;
}

export class LoginResponseDto extends SuccessResponseDto {
  @ApiProperty({ type: AuthUserDto })
  data: AuthUserDto;
}
