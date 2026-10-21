import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class DepositDto {
  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  amount: number;

  @IsOptional()
  @IsString()
  reference_id?: string;
}