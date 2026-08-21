import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { OrdersModule } from './modules/orders/orders.module';
import { GroupOrdersModule } from './modules/group-orders/group-orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DeliveryZonesModule } from './modules/delivery-zones/delivery-zones.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PlatformModule } from './modules/platform/platform.module';
import { GeocodingModule } from './modules/geocoding/geocoding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: Number(process.env.THROTTLE_TTL ?? 60) * 1000,
            limit: Number(process.env.THROTTLE_LIMIT ?? 100),
          },
        ],
      }),
    }),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    AddressesModule,
    OrdersModule,
    GroupOrdersModule,
    PaymentsModule,
    DeliveryZonesModule,
    DeliveriesModule,
    CouponsModule,
    NotificationsModule,
    LoyaltyModule,
    PromotionsModule,
    ReportsModule,
    CompaniesModule,
    UploadsModule,
    PlatformModule,
    GeocodingModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  // Resolve a empresa (tenant) em toda rota antes de qualquer guard —
  // exceto o webhook de pagamento e o disparador de cron, que são
  // chamados por sistemas externos (gateway de pagamento, Vercel Cron), e
  // exceto tudo em /platform, que é ação do DONO DA PLATAFORMA, não de
  // uma empresa específica — não faz sentido exigir (nem tentar resolver)
  // um tenant ali (ver PlatformAdminGuard).
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'payments/webhook/(.*)', method: RequestMethod.ALL },
        { path: 'promotions/cron-trigger', method: RequestMethod.ALL },
        { path: 'platform/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
