import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Company } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type TenantRequest = Request & { companyId: string; company: Company };

// Resolve a empresa (tenant) de cada request e injeta em `request.companyId`
// / `request.company`, antes de qualquer guard rodar.
//
// O frontend manda o slug no header `X-Company-Slug` assim que sabe qual
// empresa é (depois da primeira resolução). Para a PRIMEIRA chamada numa
// empresa com domínio próprio (ainda sem slug conhecido), o frontend manda
// `X-Site-Host` com o hostname que está no navegador do visitante —
// importante: `req.hostname` aqui é sempre o domínio do BACKEND
// (ex.: ar-gram-tech-o4ef-mu.vercel.app), nunca o domínio da empresa, já
// que frontend e backend são deploys/domínios diferentes na Vercel. Por
// isso o Host da própria request só entra como fallback de última
// instância (útil em setups onde os dois realmente compartilham domínio).
//
// Fallback final: enquanto só existe uma empresa ativa cadastrada,
// requests sem nenhum dos sinais acima caem nela — deixa de se aplicar
// sozinho no dia em que a 2ª empresa for cadastrada.
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const slug = req.header('x-company-slug');
    const siteHost = req.header('x-site-host');
    const host = req.hostname;

    let company: Company | null = null;

    if (slug) {
      company = await this.prisma.company.findUnique({ where: { slug } });
    } else if (siteHost) {
      company = await this.prisma.company.findUnique({ where: { customDomain: siteHost } });
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
