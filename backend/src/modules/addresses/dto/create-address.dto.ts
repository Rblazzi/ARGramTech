import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  @MinLength(2)
  street: string;

  @IsString()
  @MinLength(1)
  number: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsString()
  @MinLength(2)
  neighborhood: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsString()
  @MinLength(2)
  state: string;

  @IsString()
  @MinLength(5)
  zipCode: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
