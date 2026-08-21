import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paymentsService.getForCustomer(user.membershipId, id);
  }

  @Post(':id/pix')
  generatePix(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paymentsService.generatePixCharge(user.membershipId, user.companyId, id);
  }

  // Só para desenvolvimento local — ver aviso em PaymentsService.
  @Post(':id/simulate-approval')
  simulateApproval(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paymentsService.simulateApprovalForTesting(user.membershipId, id);
  }
}
