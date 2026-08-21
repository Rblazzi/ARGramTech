import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { CompaniesService } from '../companies/companies.service';
import { CreateCompanyDto } from '../companies/dto/create-company.dto';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { UpdateSiteContentDto } from './dto/update-site-content.dto';

// Tudo que é ação do DONO DA PLATAFORMA (não de uma empresa específica):
// login próprio, listar/criar empresas clientes, editar o conteúdo do
// site institucional. Reaproveita CompaniesService pra criação de empresa
// em vez de duplicar a lógica (Supabase Auth + Company + membership ADMIN).
@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly companiesService: CompaniesService,
  ) {}

  // Login independente do login por empresa (POST /auth/login): o token do
  // Supabase não é por empresa, então aqui só confere email/senha e, no
  // final, que a conta é mesmo isPlatformAdmin — sem tocar em
  // CompanyMembership nenhuma.
  async login(dto: PlatformLoginDto) {
    const { data, error } = await this.supabase.anonClient.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const user = await this.prisma.user.findUnique({ where: { id: data.session.user.id } });
    if (!user || !user.active || !user.isPlatformAdmin) {
      throw new ForbiddenException('Essa conta não tem acesso ao painel da plataforma');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  listCompanies() {
    return this.prisma.company.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        primaryColor: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  createCompany(dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  // SiteContent é singleton (uma linha só, semeada pela migração) — por
  // isso findFirst em vez de buscar por id fixo.
  async getSiteContent() {
    return this.prisma.siteContent.findFirst();
  }

  async updateSiteContent(dto: UpdateSiteContentDto) {
    const existing = await this.prisma.siteContent.findFirst();
    if (!existing) {
      return this.prisma.siteContent.create({ data: dto });
    }
    return this.prisma.siteContent.update({ where: { id: existing.id }, data: dto });
  }
}
