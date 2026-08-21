import { IsOptional, IsString, MinLength } from 'class-validator';

// Cada campo é opcional de propósito: o dono da empresa manda só o que
// mudou (ex.: só a cor, só o banner) — nunca a slug/admin, que não fazem
// parte da própria marca.
export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  addressText?: string;
}
