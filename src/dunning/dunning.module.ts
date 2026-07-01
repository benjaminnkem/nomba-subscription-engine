import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingModule } from '../billing/billing.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentsModule } from '../payments/payments.module';
import { QueuesModule } from '../queues/queues.module';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { DunningProcessor } from './dunning.processor';
import { DunningService } from './dunning.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription]),
    QueuesModule,
    BillingModule,
    SubscriptionsModule,
    InvoicesModule,
    PaymentsModule,
  ],
  providers: [DunningService, DunningProcessor],
  exports: [DunningService],
})
export class DunningModule {}
