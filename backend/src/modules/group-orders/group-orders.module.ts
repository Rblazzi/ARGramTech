import { Module } from '@nestjs/common';
import { GroupOrdersService } from './group-orders.service';
import { GroupOrdersController } from './group-orders.controller';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';

@Module({
  imports: [DeliveryZonesModule],
  controllers: [GroupOrdersController],
  providers: [GroupOrdersService],
})
export class GroupOrdersModule {}
