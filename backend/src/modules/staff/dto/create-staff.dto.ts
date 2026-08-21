import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

// Papéis que podem ser criados por aqui — CUSTOMER se autocadastra, e
// DRIVER tem seu próprio fluxo (precisa de veículo/placa), ver
// DeliveryDriversService/tela de Entregadores.
export const ASSIGNABLE_STAFF_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.ATTENDANT, UserRole.KITCHEN] as const;

export class CreateStaffDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
