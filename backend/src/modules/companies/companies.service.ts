import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, Company } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { UsersService } from '../users/users.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

// Campos que o frontend pode exibir antes mesmo de logar (nome, cor, logo,
// horário etc.). pixKey/autoMessages/lastOrderNumber ficam de fora de
// propósito — são dados internos de operação, não de vitrine.
function toPublicDto(company: Company) {
  const { pixKey: _pixKey, autoMessages: _autoMessages, lastOrderNumber: _lastOrderNumber, ...publicFields } = company;
  return publicFields;
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  // A empresa já foi resolvida pelo TenantMiddleware pra request atual —
  // este endpoint só devolve os dados públicos dela pro frontend montar o
  // tema (cor/logo/nome) antes mesmo do usuário logar.
  async resolveCurrent(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company || !company.active) throw new NotFoundException('Empresa não encontrada');
    return toPublicDto(company);
  }

  // Cadastra uma empresa nova na plataforma, já com o primeiro acesso
  // ADMIN dela — restrito a quem tem isPlatformAdmin (ver
  // PlatformAdminGuard). O resto (categorias, produtos, staff) a própria
  // empresa cadastra depois, logada com esse acesso.
  async create(dto: CreateCompanyDto) {
    const existingSlug = await this.prisma.company.findUnique({ where: { slug: dto.slug } });
    if (existingSlug) throw new ConflictException('Já existe uma empresa com este slug');

    const { data, error } = await this.supabase.adminClient.auth.admin.createUser({
      email: dto.adminEmail,
      password: dto.adminPassword,
      email_confirm: true,
      user_metadata: { name: dto.adminName },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        throw new ConflictException('Já existe uma conta com este e-mail de admin');
      }
      throw error;
    }

    const company = await this.prisma.company.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        primaryColor: dto.primaryColor ?? '#FF7A00',
        customDomain: dto.customDomain,
      },
    });

    await this.usersService.upsertIdentity({ id: data.user.id, email: dto.adminEmail, name: dto.adminName });
    await this.usersService.ensureMembership(data.user.id, company.id, UserRole.ADMIN);

    return toPublicDto(company);
  }

  // Edição da própria marca pelo admin da empresa (nome, logo, banner,
  // cores, contato) — nunca slug/customDomain, que são decisões da
  // plataforma na hora de criar a empresa.
  async updateCurrent(companyId: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.update({ where: { id: companyId }, data: dto });
    return toPublicDto(company);
  }
}
