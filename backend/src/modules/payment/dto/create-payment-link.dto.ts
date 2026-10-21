import { IsEnum, IsOptional } from "class-validator";

export class CreatePaymentLinkDto {
  @IsEnum(["AWASH"])
  gateway: "AWASH";
}
