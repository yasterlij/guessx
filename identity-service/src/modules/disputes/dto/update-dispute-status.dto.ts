import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class UpdateDisputeStatusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  status: string;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsString()
  @IsOptional()
  document_urls?: string;
}
