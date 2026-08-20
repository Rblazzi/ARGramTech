import { Module } from '@nestjs/common';
import { DeliveryDriversService } from './delivery-drivers.service';
import { DeliveryDriversController } from './delivery-drivers.controller';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [DeliveryDriversController, DeliveriesController],
  providers: [DeliveryDriversService, DeliveriesService],
})
export class DeliveriesModule {}
