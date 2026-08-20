import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  // Token de recuperação recebido pelo e-mail (access_token do Supabase
  // gerado pelo fluxo de recovery).
  @IsString()
  accessToken: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  newPassword: string;
}
