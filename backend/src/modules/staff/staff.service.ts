import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { UsersService } from '../users/users.service';
import { CreateStaffDto, ASSIGNABLE_STAFF_ROLES } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

const STAFF_USER_SELECT = { id: true, name: true, email: true, phone: true, active: true } as const;

// Gerencia o pessoal da empresa (ADMIN/MANAGER/ATTENDANT/KITCHEN) — quem
// pode logar no painel admin/cozinha. Entregador tem seu próprio fluxo
// (DeliveryDriversService, precisa de veículo/placa) e não passa por
// aqui, embora resetPassword funcione pra qualquer membership da empresa
// (é uma operação de identidade global, não depende do papel).
@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  findAll(companyId: string) {
    return this.prisma.companyMembership.findMany({
      where: { companyId, role: { in: [...ASSIGNABLE_STAFF_ROLES] } },
      include: { user: { select: STAFF_USER_SELECT } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(companyId: string, dto: CreateStaffDto) {
    if (!ASSIGNABLE_STAFF_ROLES.includes(dto.role as (typeof ASSIGNABLE_STAFF_ROLES)[number])) {
      throw new BadRequestException('Papel inválido — para entregadores, use a tela de Entregadores');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });

    let userId: string;
    if (existingUser) {
      const existingMembership = await this.prisma.companyMembership.findUnique({
        where: { userId_companyId: { userId: existingUser.id, companyId } },
      });
      if (existingMembership) throw new ConflictException('Essa pessoa já tem acesso a esta empresa');
      // Pessoa já tem conta na plataforma (de outra empresa) — só ganha
      // acesso aqui também, sem criar um segundo login pro mesmo e-mail.
      userId = existingUser.id;
    } else {
      const { data, error } = await this.supabase.adminClient.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: { name: dto.name },
      });
      if (error) {
        if (error.message.toLowerCase().includes('already')) {
          throw new ConflictException('Já existe uma conta com este e-mail');
        }
        throw error;
      }
      await this.usersService.upsertIdentity({ id: data.user.id, email: dto.email, name: dto.name });
      userId = data.user.id;
    }

    const membership = await this.usersService.ensureMembership(userId, companyId, dto.role);
    return this.prisma.companyMembership.findUnique({
      where: { id: membership.id },
      include: { user: { select: STAFF_USER_SELECT } },
    });
  }

  async update(companyId: string, membershipId: string, currentMembershipId: string, dto: UpdateStaffDto) {
    if (membershipId === currentMembershipId) {
      throw new ForbiddenException('Você não pode alterar seu próprio papel ou status por aqui');
    }

    const membership = await this.prisma.companyMembership.findFirst({
      where: { id: membershipId, companyId, role: { in: [...ASSIGNABLE_STAFF_ROLES] } },
    });
    if (!membership) throw new NotFoundException('Usuário não encontrado');

    if (dto.role && !ASSIGNABLE_STAFF_ROLES.includes(dto.role as (typeof ASSIGNABLE_STAFF_ROLES)[number])) {
      throw new BadRequestException('Papel inválido — para entregadores, use a tela de Entregadores');
    }

    if (dto.name) {
      await this.prisma.user.update({ where: { id: membership.userId }, data: { name: dto.name } });
    }

    return this.prisma.companyMembership.update({
      where: { id: membershipId },
      data: { role: dto.role, active: dto.active },
      include: { user: { select: STAFF_USER_SELECT } },
    });
  }

  async resetPassword(companyId: string, membershipId: string, newPassword: string) {
    const membership = await this.prisma.companyMembership.findFirst({ where: { id: membershipId, companyId } });
    if (!membership) throw new NotFoundException('Usuário não encontrado');

    const { error } = await this.supabase.adminClient.auth.admin.updateUserById(membership.userId, {
      password: newPassword,
    });
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
}
