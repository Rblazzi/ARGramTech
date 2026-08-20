import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { FakePixProvider } from './providers/fake-pix.provider';
import { PIX_PROVIDER } from './providers/pix-provider.interface';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService, { provide: PIX_PROVIDER, useClass: FakePixProvider }],
})
export class PaymentsModule {}
