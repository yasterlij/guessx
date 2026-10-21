import { IsIn, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class FintechWebhookDto {
  @IsString()
  reference_id: string;

  @IsUUID()
  user_id: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsIn(['COMPLETED', 'FAILED', 'PENDING'])
  status: string;
}