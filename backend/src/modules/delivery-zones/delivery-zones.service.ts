import { Injectable, NotFoundException } from '@nestjs/common';
import { Address, DeliveryZoneType, OrderType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

@Injectable()
export class DeliveryZonesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive(companyId: string) {
    return this.prisma.deliveryZone.findMany({ where: { companyId, active: true }, orderBy: { name: 'asc' } });
  }

  findAllForAdmin(companyId: string) {
    return this.prisma.deliveryZone.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
  }

  async findByIdOrThrow(companyId: string, id: string) {
    const zone = await this.prisma.deliveryZone.findFirst({ where: { id, companyId } });
    if (!zone) throw new NotFoundException('Zona de entrega não encontrada');
    return zone;
  }

  create(companyId: string, dto: CreateDeliveryZoneDto) {
    return this.prisma.deliveryZone.create({ data: { ...dto, companyId, active: dto.active ?? true } });
  }

  async update(companyId: string, id: string, dto: UpdateDeliveryZoneDto) {
    await this.findByIdOrThrow(companyId, id);
    return this.prisma.deliveryZone.update({ where: { id }, data: dto });
  }

  async remove(companyId: string, id: string) {
    await this.findByIdOrThrow(companyId, id);
    await this.prisma.deliveryZone.delete({ where: { id } });
  }

  // Usado pelo checkout (preview) e pela criação do pedido (valor final).
  // Ordem de prioridade: frete grátis por valor mínimo > bairro > fixa >
  // padrão da loja. Zonas por distância ficam preparadas na modelagem,
  // mas só entram em ação quando houver geocodificação de endereço
  // (latitude/longitude), que ainda não existe no sistema.
  async calculateFee(params: {
    companyId: string;
    type: OrderType;
    address: Address | null;
    subtotal: number;
  }): Promise<number> {
    if (params.type === OrderType.PICKUP) return 0;

    const zones = await this.findAllActive(params.companyId);

    const freeAbove = zones.find(
      (z) => z.type === DeliveryZoneType.FREE_ABOVE && params.subtotal >= Number(z.minOrderValueForFree ?? 0),
    );
    if (freeAbove) return 0;

    if (params.address) {
      const neighborhoodZone = zones.find(
        (z) => z.type === DeliveryZoneType.NEIGHBORHOOD && normalize(z.name) === normalize(params.address!.neighborhood),
      );
      if (neighborhoodZone) return Number(neighborhoodZone.fee);
    }

    const fixedZone = zones.find((z) => z.type === DeliveryZoneType.FIXED);
    if (fixedZone) return Number(fixedZone.fee);

    const company = await this.prisma.company.findUnique({ where: { id: params.companyId } });
    return Number(company?.deliveryFeeDefault ?? 0);
  }
}
