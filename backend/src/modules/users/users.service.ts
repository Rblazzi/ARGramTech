import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { customer: true },
    });
  }

  async findByIdOrThrow(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  // Cria (ou atualiza, se já existir) o registro local do usuário e,
  // quando o papel for CUSTOMER, também a linha de customer associada.
  // Chamado depois que o usuário é criado/autenticado no Supabase Auth.
  async upsert(params: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role?: UserRole;
  }) {
    const role = params.role ?? UserRole.CUSTOMER;

    const user = await this.prisma.user.upsert({
      where: { id: params.id },
      create: {
        id: params.id,
        email: params.email,
        name: params.name,
        phone: params.phone,
        role,
      },
      update: {
        email: params.email,
        name: params.name,
        phone: params.phone,
      },
    });

    // Usa o papel real do usuário já persistido (não o parâmetro de
    // entrada, que só vale para a criação) para decidir se cria o
    // customer — evita criar customer para um admin/atendente/etc. que
    // já existia e só está fazendo login de novo.
    if (user.role === UserRole.CUSTOMER) {
      await this.prisma.customer.upsert({
        where: { id: params.id },
        create: { id: params.id },
        update: {},
      });
    }

    return user;
  }
}
