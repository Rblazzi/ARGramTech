import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForCustomer(customerId: string) {
    return this.prisma.address.findMany({
      where: { customerId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOwnedOrThrow(customerId: string, id: string) {
    const address = await this.prisma.address.findFirst({ where: { id, customerId, deletedAt: null } });
    if (!address) throw new NotFoundException('Endereço não encontrado');
    return address;
  }

  async create(customerId: string, dto: CreateAddressDto) {
    const isFirstAddress = (await this.prisma.address.count({ where: { customerId, deletedAt: null } })) === 0;
    const isDefault = dto.isDefault ?? isFirstAddress;

    if (isDefault) {
      await this.unsetCurrentDefault(customerId);
    }

    return this.prisma.address.create({
      data: { ...dto, customerId, isDefault },
    });
  }

  async update(customerId: string, id: string, dto: UpdateAddressDto) {
    await this.findOwnedOrThrow(customerId, id);
    if (dto.isDefault) {
      await this.unsetCurrentDefault(customerId);
    }
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async remove(customerId: string, id: string) {
    await this.findOwnedOrThrow(customerId, id);
    await this.prisma.address.update({ where: { id }, data: { deletedAt: new Date(), isDefault: false } });
  }

  private unsetCurrentDefault(customerId: string) {
    return this.prisma.address.updateMany({
      where: { customerId, isDefault: true },
      data: { isDefault: false },
    });
  }
}
