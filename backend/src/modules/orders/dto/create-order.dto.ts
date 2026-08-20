import { IsEnum, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { OrderType, PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
  @IsEnum(OrderType)
  type: OrderType;

  @ValidateIf((dto: CreateOrderDto) => dto.type === OrderType.DELIVERY)
  @IsUUID()
  addressId?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;
}
