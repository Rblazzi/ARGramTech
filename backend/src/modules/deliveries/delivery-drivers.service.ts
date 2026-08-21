import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { UsersService } from '../users/users.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DeliveryDriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  findAll(companyId: string) {
    return this.prisma.deliveryDriver.findMany({
      where: { membership: { companyId } },
      include: { membership: { include: { user: { select: { name: true, email: true, phone: true, active: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, dto: CreateDriverDto) {
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

    await this.usersService.upsertIdentity({
      id: data.user.id,
      email: dto.email,
      name: dto.name,
      phone: dto.phone,
    });
    const membership = await this.usersService.ensureMembership(data.user.id, companyId, UserRole.DRIVER);

    return this.prisma.deliveryDriver.create({
      data: { id: membership.id, vehicleType: dto.vehicleType, vehiclePlate: dto.vehiclePlate },
      include: { membership: { include: { user: { select: { name: true, email: true, phone: true, active: true } } } } },
    });
  }

  async update(companyId: string, id: string, dto: UpdateDriverDto) {
    const driver = await this.prisma.deliveryDriver.findFirst({ where: { id, membership: { companyId } } });
    if (!driver) throw new NotFoundException('Entregador não encontrado');

    return this.prisma.deliveryDriver.update({
      where: { id },
      data: { vehicleType: dto.vehicleType, vehiclePlate: dto.vehiclePlate, active: dto.active },
      include: { membership: { include: { user: { select: { name: true, email: true, phone: true, active: true } } } } },
    });
  }
}
