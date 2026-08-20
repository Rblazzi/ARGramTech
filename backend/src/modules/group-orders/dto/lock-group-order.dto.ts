import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, IsUUID, Min, ValidateIf, ValidateNested } from 'class-validator';
import { OrderType } from '@prisma/client';

class CustomSplitAmountDto {
  @IsUUID()
  memberId: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class LockGroupOrderDto {
  @IsEnum(OrderType)
  type: OrderType;

  @ValidateIf((dto: LockGroupOrderDto) => dto.type === OrderType.DELIVERY)
  @IsUUID()
  addressId?: string;

  // Só usado quando o grupo está configurado com paymentMode = SPLIT_CUSTOM.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CustomSplitAmountDto)
  customAmounts?: CustomSplitAmountDto[];
}
