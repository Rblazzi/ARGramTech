import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../../../supabase/supabase.service';
import { UsersService } from '../../users/users.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

// Exige um Bearer token válido emitido pelo Supabase Auth em todo endpoint
// protegido. A assinatura é verificada via JWKS (SupabaseService) e o
// usuário correspondente é carregado do nosso banco local e anexado em
// `request.user`.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token não informado');
    }

    let userId: string;
    try {
      const payload = await this.supabase.verifyAccessToken(token);
      userId = payload.sub as string;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const user = await this.usersService.findById(userId);
    if (!user || !user.active || user.deletedAt) {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    (request as Request & { user: AuthenticatedUser }).user = authenticatedUser;

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
