import { Injectable, NotFoundException } from '@nestjs/common';
import { Company } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Campos que o frontend pode exibir antes mesmo de logar (nome, cor, logo,
// horário etc.). pixKey/autoMessages/lastOrderNumber ficam de fora de
// propósito — são dados internos de operação, não de vitrine.
function toPublicDto(company: Company) {
  const { pixKey: _pixKey, autoMessages: _autoMessages, lastOrderNumber: _lastOrderNumber, ...publicFields } = company;
  return publicFields;
}

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  // A empresa já foi resolvida pelo TenantMiddleware pra request atual —
  // este endpoint só devolve os dados públicos dela pro frontend montar o
  // tema (cor/logo/nome) antes mesmo do usuário logar.
  async resolveCurrent(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company || !company.active) throw new NotFoundException('Empresa não encontrada');
    return toPublicDto(company);
  }
}
