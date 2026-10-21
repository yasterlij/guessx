import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateDisputeDto {
  @IsUUID()
  @IsOptional()
  auction_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  document_urls?: string;
}
