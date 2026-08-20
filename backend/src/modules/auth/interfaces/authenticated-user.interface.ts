import { UserRole } from '@prisma/client';

// Formato final anexado em `request.user` depois que o JwtStrategy valida
// o token do Supabase e resolve o usuário correspondente no nosso banco.
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
