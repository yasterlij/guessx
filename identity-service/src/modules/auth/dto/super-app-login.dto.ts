import { IsString, MinLength } from 'class-validator';

export class SuperAppLoginDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @MinLength(1)
  redirect_uri: string;
}