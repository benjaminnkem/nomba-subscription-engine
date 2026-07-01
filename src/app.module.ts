import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { CustomersModule } from './customers/customers.module';
import { DatabaseModule } from './database/database.module';
import { DunningModule } from './dunning/dunning.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { InvoicesModule } from './invoices/invoices.module';
import { MerchantsModule } from './merchants/merchants.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NombaWebhooksModule } from './payments/nomba-webhooks.module';
import { PaymentsModule } from './payments/payments.module';
import { PlansModule } from './plans/plans.module';
import { QueuesModule } from './queues/queues.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    DatabaseModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    QueuesModule,
    AuthModule,
    MerchantsModule,
    ApiKeysModule,
    PlansModule,
    CustomersModule,
    SubscriptionsModule,
    InvoicesModule,
    PaymentsModule,
    NombaWebhooksModule,
    BillingModule,
    DunningModule,
    WebhooksModule,
    NotificationsModule,
    AnalyticsModule,
    AuditModule,
    EventsModule,
    HealthModule,
  ],
})
export class AppModule {}
