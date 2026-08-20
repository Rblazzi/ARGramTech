import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { DeliveryZoneType } from '@prisma/client';

export class CreateDeliveryZoneDto {
  @IsEnum(DeliveryZoneType)
  type: DeliveryZoneType;

  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0)
  fee: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minDistanceKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistanceKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValueForFree?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
