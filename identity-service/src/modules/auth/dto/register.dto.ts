import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from "class-validator";

export class RegisterDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{9,15}$/)
  phone_number?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  full_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  access_token?: string;
}
