import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';
import { PromotionsCronController } from './promotions-cron.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PromotionsController, PromotionsCronController],
  providers: [PromotionsService],
})
export class PromotionsModule {}
