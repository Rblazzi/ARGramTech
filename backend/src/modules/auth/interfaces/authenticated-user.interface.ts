import { UserRole } from '@prisma/client';

// Formato final anexado em `request.user` depois que o JwtAuthGuard valida
// o token do Supabase e resolve a membership do usuário NA EMPRESA da
// request atual (request.companyId, resolvido pelo TenantMiddleware).
//
// `membershipId` é o id da CompanyMembership — é também o id usado como
// customerId/driverId nas tabelas Customer/DeliveryDriver (que têm 1:1
// com CompanyMembership), então é isso que os controllers devem passar
// pros services quando o parâmetro é "customerId" ou "driverId". `id` é a
// identidade global (Supabase Auth / users.id) — só usar quando o
// destino é mesmo a tabela `users` (ex.: auditoria de quem alterou algo).
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  membershipId: string;
  // Dono da plataforma (não de uma empresa específica) — só quem tem
  // isso pode cadastrar novas empresas (ver PlatformAdminGuard).
  isPlatformAdmin: boolean;
}
