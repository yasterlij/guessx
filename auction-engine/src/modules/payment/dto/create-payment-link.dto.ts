import { IsEnum, IsOptional } from "class-validator";

export class CreatePaymentLinkDto {
  @IsEnum(["SIKINAPAY", "AWASH"])
  gateway: "SIKINAPAY" | "AWASH";
}
