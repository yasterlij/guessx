import { IsNumber, Min, Max, IsNotEmpty } from "class-validator";

export class BidDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: "Enter a valid bid amount" })
  @Min(1.0, { message: "Minimum bid is 1.00" })
  @Max(999999.99, { message: "Bid amount is too large" })
  @IsNotEmpty()
  amount: number;
}
