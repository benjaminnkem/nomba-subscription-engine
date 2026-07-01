import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { BillingService } from '../billing/billing.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PaymentsService } from '../payments/payments.service';
import { QUEUE_NAMES } from '../queues/queue.constants';
import { SubscriptionStatus } from '../shared/enums';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export const DUNNING_DELAYS_MS = [
  24 * 60 * 60 * 1000,
  72 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
] as const;

@Injectable()
export class DunningService {
  private readonly logger = new Logger(DunningService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectQueue(QUEUE_NAMES.DUNNING) private dunningQueue: Queue,
    private subscriptionsService: SubscriptionsService,
    private billingService: BillingService,
    private invoicesService: InvoicesService,
    private paymentsService: PaymentsService,
  ) {}

  async scheduleRetry(
    subscriptionId: string,
    attemptNumber: number,
  ): Promise<void> {
    if (attemptNumber > DUNNING_DELAYS_MS.length) {
      await this.suspendSubscription(subscriptionId);
      return;
    }

    const delay = DUNNING_DELAYS_MS[attemptNumber - 1];
    await this.dunningQueue.add(
      'dunning-retry',
      { subscriptionId, attemptNumber },
      { delay, removeOnComplete: true },
    );
    this.logger.log(
      `Scheduled dunning attempt ${attemptNumber} for subscription ${subscriptionId} in ${delay}ms`,
    );
  }

  async processRetry(
    subscriptionId: string,
    attemptNumber: number,
  ): Promise<void> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
    });
    if (!subscription) return;

    if (
      subscription.status !== SubscriptionStatus.PAST_DUE &&
      subscription.status !== SubscriptionStatus.GRACE_PERIOD
    ) {
      return;
    }

    subscription.dunningAttemptCount = attemptNumber;
    await this.subscriptionRepo.save(subscription);

    await this.billingService.billSubscription(subscription);

    const refreshed = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
    });
    if (!refreshed) return;

    if (refreshed.status === SubscriptionStatus.ACTIVE) {
      this.logger.log(`Payment recovered for subscription ${subscriptionId}`);
      return;
    }

    if (attemptNumber < DUNNING_DELAYS_MS.length) {
      if (attemptNumber === 2) {
        await this.subscriptionsService.transitionStatus(
          refreshed,
          SubscriptionStatus.GRACE_PERIOD,
        );
      }
      await this.scheduleRetry(subscriptionId, attemptNumber + 1);
    } else {
      await this.suspendSubscription(subscriptionId);
    }
  }

  async suspendSubscription(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
    });
    if (!subscription) return;

    await this.subscriptionsService.transitionStatus(
      subscription,
      SubscriptionStatus.SUSPENDED,
    );
    this.logger.warn(`Subscription ${subscriptionId} suspended after dunning`);
  }

  async onPaymentFailed(subscriptionId: string): Promise<void> {
    await this.scheduleRetry(subscriptionId, 1);
  }
}
