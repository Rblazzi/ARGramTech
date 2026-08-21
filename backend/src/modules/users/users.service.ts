import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  // Autoatendimento: a pessoa altera o próprio nome/telefone. Nunca por
  // id de outra pessoa — o id vem sempre do token (request.user.id), não
  // de parâmetro de rota.
  updateProfile(id: string, data: { name?: string; phone?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  // Cria (ou atualiza) só a identidade global do usuário — sem role, sem
  // vínculo com empresa nenhuma. O papel dele em cada empresa vive em
  // CompanyMembership (ver ensureMembership).
  upsertIdentity(params: { id: string; email: string; name: string; phone?: string }) {
    return this.prisma.user.upsert({
      where: { id: params.id },
      create: {
        id: params.id,
        email: params.email,
        name: params.name,
        phone: params.phone,
      },
      update: {
        email: params.email,
        name: params.name,
        phone: params.phone,
      },
    });
  }

  // Garante que o usuário tenha uma membership na empresa informada,
  // criando com o role padrão (CUSTOMER) se ainda não existir. Não muda o
  // role de uma membership já existente — isso só é decidido na criação.
  //
  // Quando o role (já existente ou recém-criado) for CUSTOMER, garante
  // também a linha satélite em `customers` (necessária pra carrinho,
  // pedidos, fidelidade etc.). DRIVER não entra aqui de propósito: quem
  // cria um entregador é DeliveryDriversService, que já cria a linha em
  // `delivery_drivers` com os dados reais (veículo, placa).
  async ensureMembership(userId: string, companyId: string, role: UserRole = UserRole.CUSTOMER) {
    const membership = await this.prisma.companyMembership.upsert({
      where: { userId_companyId: { userId, companyId } },
      create: { userId, companyId, role },
      update: {},
    });

    if (membership.role === UserRole.CUSTOMER) {
      await this.prisma.customer.upsert({
        where: { id: membership.id },
        create: { id: membership.id },
        update: {},
      });
    }

    return membership;
  }
}
