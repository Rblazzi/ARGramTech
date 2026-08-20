import { IsEnum, IsOptional } from 'class-validator';
import { DeliveryFeeSplitMode, PaymentMode } from '@prisma/client';

export class CreateGroupOrderDto {
  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @IsOptional()
  @IsEnum(DeliveryFeeSplitMode)
  deliveryFeeSplitMode?: DeliveryFeeSplitMode;
}
