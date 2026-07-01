import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DOMAIN_EVENTS } from '../events/domain-events';
import { EventsService } from '../events/events.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PaymentsService } from '../payments/payments.service';
import { ProrationService } from './proration.service';
import { PaymentStatus, SubscriptionStatus } from '../shared/enums';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Plan } from '../plans/entities/plan.entity';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
    private subscriptionsService: SubscriptionsService,
    private invoicesService: InvoicesService,
    private paymentsService: PaymentsService,
    private prorationService: ProrationService,
    private eventsService: EventsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processBillingCycles(): Promise<void> {
    this.logger.log('Running billing cycle processor');
    const dueSubscriptions =
      await this.subscriptionsService.findDueForBilling();

    for (const subscription of dueSubscriptions) {
      try {
        await this.billSubscription(subscription);
      } catch (error) {
        this.logger.error(
          `Billing failed for subscription ${subscription.id}`,
          error,
        );
      }
    }
  }

  async billSubscription(subscription: Subscription): Promise<void> {
    const plan = await this.planRepo.findOne({
      where: { id: subscription.planId, merchantId: subscription.merchantId },
    });
    if (!plan) return;

    if (
      subscription.status === SubscriptionStatus.TRIALING &&
      subscription.trialEndsAt &&
      subscription.trialEndsAt > new Date()
    ) {
      return;
    }

    if (subscription.status === SubscriptionStatus.TRIALING) {
      await this.subscriptionsService.transitionStatus(
        subscription,
        SubscriptionStatus.ACTIVE,
      );
    }

    const invoice = await this.invoicesService.create({
      merchantId: subscription.merchantId,
      customerId: subscription.customerId,
      subscriptionId: subscription.id,
      items: [
        {
          description: `${plan.name} subscription`,
          quantity: 1,
          unitAmount: parseFloat(plan.amount),
        },
      ],
      currency: plan.currency,
    });

    const payment = await this.paymentsService.chargeInvoice(invoice);

    if (payment.status === PaymentStatus.SUCCEEDED) {
      await this.invoicesService.markPaid(invoice);
      const intervalDays = this.prorationService.getIntervalDays(
        plan.interval,
        plan.customIntervalDays,
      );
      subscription.currentPeriodStart = new Date();
      subscription.currentPeriodEnd = new Date(
        Date.now() + intervalDays * 86400000,
      );
      subscription.dunningAttemptCount = 0;
      await this.subscriptionRepo.save(subscription);

      await this.eventsService.emit(DOMAIN_EVENTS.INVOICE_PAID, {
        merchantId: subscription.merchantId,
        aggregateType: 'invoice',
        aggregateId: invoice.id,
        data: { invoice, payment, subscription },
      });

      await this.eventsService.emit(DOMAIN_EVENTS.SUBSCRIPTION_RENEWED, {
        merchantId: subscription.merchantId,
        aggregateType: 'subscription',
        aggregateId: subscription.id,
        data: { subscription, invoice },
      });
    } else {
      await this.invoicesService.markFailed(invoice);
      await this.subscriptionsService.transitionStatus(
        subscription,
        SubscriptionStatus.PAST_DUE,
      );
    }
  }
}
