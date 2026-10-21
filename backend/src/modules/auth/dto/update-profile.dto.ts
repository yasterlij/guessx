import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  full_name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;
}