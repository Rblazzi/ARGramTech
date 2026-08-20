import { IsBoolean, IsObject, IsOptional, IsEnum, IsString, IsUUID, MinLength } from 'class-validator';
import { PromotionType } from '@prisma/client';

export class CreatePromotionDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(PromotionType)
  type: PromotionType;

  // BIRTHDAY: {} · INACTIVE_CUSTOMER: { days: number } · MIN_ORDER_VALUE: { minValue: number }
  @IsObject()
  ruleConfig: Record<string, number>;

  @IsOptional()
  @IsUUID()
  couponId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
