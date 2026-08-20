import { ArrayUnique, IsArray, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AddGroupItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  optionItemIds?: string[];
}
