import { IsOptional, IsString } from 'class-validator';

export class UpdateSiteContentDto {
  @IsOptional()
  @IsString()
  heroEyebrow?: string;

  @IsOptional()
  @IsString()
  heroText?: string;

  @IsOptional()
  @IsString()
  heroCtaPrimaryLabel?: string;

  @IsOptional()
  @IsString()
  heroCtaSecondaryLabel?: string;

  @IsOptional()
  @IsString()
  footerTagline?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
