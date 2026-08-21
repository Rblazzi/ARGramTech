import { IsBoolean, IsLatitude, IsLongitude, IsOptional, IsString, MinLength } from 'class-validator';

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

  // Preenchidos quando o endereço é escolhido via busca/mapa
  // (GeocodingModule) — permitem mostrar o pino exato pro entregador em
  // vez de só o texto do endereço.
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
