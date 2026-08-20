import { IsUUID } from 'class-validator';

export class QuoteDeliveryFeeDto {
  @IsUUID()
  addressId: string;
}
