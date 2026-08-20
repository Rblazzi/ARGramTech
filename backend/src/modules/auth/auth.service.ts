import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; email: string; name: string };
}

// Toda a lógica de autenticação fica aqui. O Supabase (GoTrue) é o motor
// que de fato guarda credenciais e emite tokens; este serviço só orquestra
// as chamadas e sincroniza o resultado com a tabela local `users`.
@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSession> {
    const { data: created, error: createError } = await this.supabase.adminClient.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true, // em produção, avalie exigir confirmação por e-mail
      user_metadata: { name: dto.name },
    });

    if (createError) {
      if (createError.message.toLowerCase().includes('already')) {
        throw new ConflictException('Já existe uma conta com este e-mail');
      }
      throw new BadRequestException(createError.message);
    }

    await this.usersService.upsert({
      id: created.user.id,
      email: dto.email,
      name: dto.name,
      phone: dto.phone,
    });

    return this.login({ email: dto.email, password: dto.password });
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const { data, error } = await this.supabase.anonClient.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    return this.toSession(data.session);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const { data, error } = await this.supabase.anonClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Sessão expirada, faça login novamente');
    }

    return this.toSession(data.session);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    // Dispara o e-mail de recuperação através do provedor SMTP configurado
    // no Supabase. Em ambiente local, os e-mails caem no Inbucket
    // (http://127.0.0.1:54324) em vez de serem enviados de fato.
    await this.supabase.anonClient.auth.resetPasswordForEmail(dto.email);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    let userId: string;
    try {
      const payload = await this.supabase.verifyAccessToken(dto.accessToken);
      userId = payload.sub as string;
    } catch {
      throw new UnauthorizedException('Token de recuperação inválido ou expirado');
    }

    const { error } = await this.supabase.adminClient.auth.admin.updateUserById(userId, {
      password: dto.newPassword,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  private async toSession(session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
  }): Promise<AuthSession> {
    const email = session.user.email ?? '';
    const name = (session.user.user_metadata?.name as string) ?? email;

    // Garante que o usuário local exista mesmo se ele foi criado
    // diretamente no Supabase (ex.: painel do Supabase, migração de dados).
    const localUser = await this.usersService.upsert({ id: session.user.id, email, name });

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      user: { id: localUser.id, email: localUser.email, name: localUser.name },
    };
  }
}
