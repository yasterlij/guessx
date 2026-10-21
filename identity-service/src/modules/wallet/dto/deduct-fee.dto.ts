import { IsNumber, IsString, IsUUID, Max, Min } from "class-validator";

export class DeductFeeDto {
  @IsUUID()
  user_id: string;

  @IsNumber()
  @Min(1.00)
  @Max(10000)
  amount: number;
}
