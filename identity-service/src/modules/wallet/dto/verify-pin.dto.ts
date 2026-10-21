import { Matches } from 'class-validator';

export class VerifyPinDto {
  @Matches(/^\d{4,6}$/)
  pin: string;
}