import { Global, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

// Global porque UsersService é dependência do JwtAuthGuard, usado em
// praticamente todo controller protegido da aplicação.
@Global()
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
