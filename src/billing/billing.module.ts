import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../events/events.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentsModule } from '../payments/payments.module';
import { Plan } from '../plans/entities/plan.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BillingService } from './billing.service';
import { ProrationService } from './proration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Plan]),
    forwardRef(() => SubscriptionsModule),
    InvoicesModule,
    PaymentsModule,
    EventsModule,
  ],
  providers: [BillingService, ProrationService],
  exports: [BillingService, ProrationService],
})
export class BillingModule {}
