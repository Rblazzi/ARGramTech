import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Company } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type TenantRequest = Request & { companyId: string; company: Company };

// Resolve a empresa (tenant) de cada request e injeta em `request.companyId`
// / `request.company`, antes de qualquer guard rodar. O frontend manda o
// slug no header `X-Company-Slug`; se a request vier de um domínio próprio
// de alguma empresa (Company.customDomain), usa o Host em vez disso.
//
// Fallback transitório: enquanto só existe uma empresa ativa cadastrada,
// requests sem nenhum dos dois sinais (ex.: o frontend atual, que ainda
// não manda X-Company-Slug) caem nela — deixa de se aplicar sozinho no
// dia em que a 2ª empresa for cadastrada.
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const slug = req.header('x-company-slug');
    const host = req.hostname;

    let company: Company | null = null;

    if (slug) {
      company = await this.prisma.company.findUnique({ where: { slug } });
    } else if (host) {
      company = await this.prisma.company.findUnique({ where: { customDomain: host } });
    }

    if (!company) {
      const activeCompanies = await this.prisma.company.findMany({ where: { active: true }, take: 2 });
      if (activeCompanies.length === 1) {
        company = activeCompanies[0];
      }
    }

    if (!company || !company.active) {
      throw new NotFoundException('Empresa não encontrada. Informe o header X-Company-Slug.');
    }

    (req as TenantRequest).companyId = company.id;
    (req as TenantRequest).company = company;
    next();
  }
}
