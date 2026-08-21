import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';

// Guard separado do JwtAuthGuard de propósito: aquele exige uma
// CompanyMembership na empresa resolvida pela request atual, mas ações de
// plataforma (como criar uma empresa nova) não pertencem a empresa
// nenhuma — por isso essas rotas também ficam de fora do TenantMiddleware
// (ver app.module.ts). Aqui só valida o token e o flag isPlatformAdmin no
// User, sem depender de tenant nenhum.
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const token = header?.split(' ')[1];
    if (!token) throw new UnauthorizedException('Token não informado');

    let userId: string;
    try {
      const payload = await this.supabase.verifyAccessToken(token);
      userId = payload.sub as string;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active || !user.isPlatformAdmin) {
      throw new ForbiddenException('Ação restrita ao administrador da plataforma');
    }

    (request as Request & { platformUser: typeof user }).platformUser = user;

    return true;
  }
}
