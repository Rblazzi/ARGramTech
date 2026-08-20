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

  findAllActive() {
    return this.prisma.deliveryZone.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }

  findAllForAdmin() {
    return this.prisma.deliveryZone.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findByIdOrThrow(id: string) {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('Zona de entrega não encontrada');
    return zone;
  }

  create(dto: CreateDeliveryZoneDto) {
    return this.prisma.deliveryZone.create({ data: { ...dto, active: dto.active ?? true } });
  }

  async update(id: string, dto: UpdateDeliveryZoneDto) {
    await this.findByIdOrThrow(id);
    return this.prisma.deliveryZone.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findByIdOrThrow(id);
    await this.prisma.deliveryZone.delete({ where: { id } });
  }

  // Usado pelo checkout (preview) e pela criação do pedido (valor final).
  // Ordem de prioridade: frete grátis por valor mínimo > bairro > fixa >
  // padrão da loja. Zonas por distância ficam preparadas na modelagem,
  // mas só entram em ação quando houver geocodificação de endereço
  // (latitude/longitude), que ainda não existe no sistema.
  async calculateFee(params: { type: OrderType; address: Address | null; subtotal: number }): Promise<number> {
    if (params.type === OrderType.PICKUP) return 0;

    const zones = await this.findAllActive();

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

    const settings = await this.prisma.storeSettings.findFirst();
    return Number(settings?.deliveryFeeDefault ?? 0);
  }
}
