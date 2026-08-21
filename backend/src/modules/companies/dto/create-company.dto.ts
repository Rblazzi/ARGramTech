import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MinLength(2)
  name: string;

  // Usado na URL (/loja/:slug) e como identificador único — só
  // minúsculas, números e hífen, pra não dar problema em link/rota.
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug deve conter só letras minúsculas, números e hífen',
  })
  slug: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  customDomain?: string;

  // Cria junto o primeiro acesso ADMIN da empresa nova — sem isso,
  // ninguém conseguiria entrar nela pra cadastrar produtos/staff depois.
  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(8)
  adminPassword: string;

  @IsString()
  @MinLength(2)
  adminName: string;
}
