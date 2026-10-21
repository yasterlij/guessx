import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  IsDateString,
  IsEnum,
  IsObject,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  IsUUID,
} from "class-validator";
import { AuctionStatus } from "../../winner/entities/auction.entity";

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  image_urls?: string[];

  @IsNumber()
  @Min(0)
  current_market_price: number;

  @IsOptional()
  @IsObject()
  specs?: Record<string, string>;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  image_urls?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  current_market_price?: number;

  @IsOptional()
  @IsObject()
  specs?: Record<string, string>;
}

export class CreateAuctionDto {
  @IsUUID()
  product_id: string;

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsOptional()
  @IsNumber()
  min_bid?: number;

  @IsOptional()
  @IsNumber()
  max_bid?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bid_fee?: number;
}

export class UpdateAuctionDto {
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsDateString()
  start_time?: string;

  @IsOptional()
  @IsDateString()
  end_time?: string;

  @IsOptional()
  @IsNumber()
  min_bid?: number;

  @IsOptional()
  @IsNumber()
  max_bid?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bid_fee?: number;

  @IsOptional()
  @IsEnum(AuctionStatus)
  status?: AuctionStatus;
}
