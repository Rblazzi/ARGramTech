import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  prepTimeMinutes?: number;

  @IsString()
  @MinLength(1)
  internalCode: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
