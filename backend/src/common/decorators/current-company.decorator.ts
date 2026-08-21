import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantRequest } from '../middleware/tenant.middleware';

// Uso: @CurrentCompany() companyId: string
// Disponível em toda rota (autenticada ou pública), já que o
// TenantMiddleware resolve a empresa antes de qualquer guard.
export const CurrentCompany = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<TenantRequest>();
  return request.companyId;
});
