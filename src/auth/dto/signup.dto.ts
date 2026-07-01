import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  businessName: string;

  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}
