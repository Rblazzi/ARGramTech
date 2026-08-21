import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista pública: só categorias ativas, ordenadas para exibição no cardápio.
  findAllActive(companyId: string) {
    return this.prisma.category.findMany({
      where: { companyId, active: true, deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  // Lista para o admin: inclui inativas também.
  findAllForAdmin(companyId: string) {
    return this.prisma.category.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  async findByIdOrThrow(companyId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return category;
  }

  async create(companyId: string, dto: CreateCategoryDto) {
    const slug = await this.uniqueSlug(companyId, dto.name);
    return this.prisma.category.create({
      data: {
        companyId,
        name: dto.name,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        position: dto.position ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateCategoryDto) {
    await this.findByIdOrThrow(companyId, id);
    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        position: dto.position,
        active: dto.active,
      },
    });
  }

  // Soft delete: preserva histórico de pedidos que referenciam produtos
  // desta categoria.
  async remove(companyId: string, id: string) {
    await this.findByIdOrThrow(companyId, id);
    await this.prisma.category.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  }

  private async uniqueSlug(companyId: string, name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.category.findUnique({
        where: { companyId_slug: { companyId, slug: candidate } },
      });
      if (!existing) return candidate;
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
  }
}
