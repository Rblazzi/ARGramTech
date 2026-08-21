import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupabaseService } from '../../../supabase/supabase.service';
import { TenantRequest } from '../../../common/middleware/tenant.middleware';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

// Exige um Bearer token válido emitido pelo Supabase Auth em todo endpoint
// protegido. A assinatura é verificada via JWKS (SupabaseService). O papel
// (role) do usuário é resolvido pela CompanyMembership NA EMPRESA da
// request atual (request.companyId, já setado pelo TenantMiddleware) —
// por isso este guard sempre roda depois do middleware, nunca antes.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
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

    const membership = await this.prisma.companyMembership.findUnique({
      where: { userId_companyId: { userId, companyId: request.companyId } },
      include: { user: true },
    });

    if (!membership || !membership.active) {
      throw new UnauthorizedException('Você não tem acesso a esta empresa');
    }
    if (!membership.user.active || membership.user.deletedAt) {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }

    const authenticatedUser: AuthenticatedUser = {
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      role: membership.role,
      companyId: membership.companyId,
      membershipId: membership.id,
      isPlatformAdmin: membership.user.isPlatformAdmin,
    };
    (request as TenantRequest & { user: AuthenticatedUser }).user = authenticatedUser;

    return true;
  }

  private extractToken(request: TenantRequest): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
