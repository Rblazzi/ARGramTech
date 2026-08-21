import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.coupon.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { usages: true } } },
    });
  }

  async findByIdOrThrow(companyId: string, id: string) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, companyId } });
    if (!coupon) throw new NotFoundException('Cupom não encontrado');
    return coupon;
  }

  async create(companyId: string, dto: CreateCouponDto) {
    const code = dto.code.toUpperCase();
    const existing = await this.prisma.coupon.findUnique({ where: { companyId_code: { companyId, code } } });
    if (existing) throw new ConflictException('Já existe um cupom com este código');

    return this.prisma.coupon.create({
      data: {
        companyId,
        code,
        type: dto.type,
        value: dto.value,
        minOrderValue: dto.minOrderValue,
        usageLimit: dto.usageLimit,
        usageLimitPerCustomer: dto.usageLimitPerCustomer,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        active: dto.active ?? true,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateCouponDto) {
    await this.findByIdOrThrow(companyId, id);
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code ? dto.code.toUpperCase() : undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findByIdOrThrow(companyId, id);
    await this.prisma.coupon.update({ where: { id }, data: { active: false } });
  }
}
