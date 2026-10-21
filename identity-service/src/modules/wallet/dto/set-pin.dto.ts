import { Matches } from "class-validator";

export class SetPinDto {
  @Matches(/^\d{4,6}$/)
  pin: string;
}
