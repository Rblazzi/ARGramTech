import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

// Uso: @CurrentPlatformUser() user: User — só disponível em rotas
// guardadas por PlatformAdminGuard, que é quem anexa request.platformUser.
export const CurrentPlatformUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
  const request = ctx.switchToHttp().getRequest<{ platformUser: User }>();
  return request.platformUser;
});
