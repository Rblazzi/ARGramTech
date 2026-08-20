import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global para não precisar importar em todo módulo de negócio.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
