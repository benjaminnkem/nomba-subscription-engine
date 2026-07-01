import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingModule } from '../billing/billing.module';
import { CustomersModule } from '../customers/customers.module';
import { DunningModule } from '../dunning/dunning.module';
import { EventsModule } from '../events/events.module';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoicesModule } from '../invoices/invoices.module';
import { Plan } from '../plans/entities/plan.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NombaWebhookEvent } from './entities/nomba-webhook-event.entity';
import { PaymentAttempt } from './entities/payment-attempt.entity';
import { Payment } from './entities/payment.entity';
import { NombaWebhooksController } from './nomba-webhooks.controller';
import { NombaWebhooksService } from './nomba-webhooks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NombaWebhookEvent,
      Payment,
      PaymentAttempt,
      Invoice,
      Subscription,
      Plan,
    ]),
    CustomersModule,
    InvoicesModule,
    SubscriptionsModule,
    BillingModule,
    DunningModule,
    EventsModule,
  ],
  controllers: [NombaWebhooksController],
  providers: [NombaWebhooksService],
})
export class NombaWebhooksModule {}