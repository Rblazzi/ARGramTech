import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista pública: só categorias ativas, ordenadas para exibição no cardápio.
  findAllActive() {
    return this.prisma.category.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  // Lista para o admin: inclui inativas também.
  findAllForAdmin() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  async findByIdOrThrow(id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = await this.uniqueSlug(dto.name);
    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        position: dto.position ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findByIdOrThrow(id);
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
  async remove(id: string) {
    await this.findByIdOrThrow(id);
    await this.prisma.category.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.category.findUnique({ where: { slug: candidate } });
      if (!existing) return candidate;
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
  }
}
