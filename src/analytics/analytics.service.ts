import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventStore } from '../events/entities/event-store.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Plan } from '../plans/entities/plan.entity';
import {
  PaymentStatus,
  PlanInterval,
  SubscriptionStatus,
} from '../shared/enums';
import { Subscription } from '../subscriptions/entities/subscription.entity';

export interface AnalyticsMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  recoveryRate: number;
  activeSubscriptions: number;
  failedPayments: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(Plan)
    private planRepo: Repository<Plan>,
  ) {}

  async getMetrics(merchantId: string): Promise<AnalyticsMetrics> {
    const [
      activeSubscriptions,
      trialingSubscriptions,
      pastDueSubscriptions,
      cancelledLast30Days,
      totalActiveStart,
      failedPayments,
      recoveredPayments,
      subscriptions,
    ] = await Promise.all([
      this.subscriptionRepo.count({
        where: { merchantId, status: SubscriptionStatus.ACTIVE },
      }),
      this.subscriptionRepo.count({
        where: { merchantId, status: SubscriptionStatus.TRIALING },
      }),
      this.subscriptionRepo.count({
        where: { merchantId, status: SubscriptionStatus.PAST_DUE },
      }),
      this.countCancelledLast30Days(merchantId),
      this.countActive30DaysAgo(merchantId),
      this.paymentRepo.count({
        where: { merchantId, status: PaymentStatus.FAILED },
      }),
      this.paymentRepo.count({
        where: { merchantId, status: PaymentStatus.SUCCEEDED },
      }),
      this.subscriptionRepo.find({
        where: {
          merchantId,
          status: SubscriptionStatus.ACTIVE,
        },
        relations: { plan: true },
      }),
    ]);

    const mrr = await this.calculateMrr(merchantId, subscriptions);
    const arr = mrr * 12;
    const churnRate =
      totalActiveStart > 0 ? (cancelledLast30Days / totalActiveStart) * 100 : 0;
    const totalPaymentAttempts = failedPayments + recoveredPayments;
    const recoveryRate =
      totalPaymentAttempts > 0
        ? (recoveredPayments / totalPaymentAttempts) * 100
        : 0;

    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      recoveryRate: Math.round(recoveryRate * 100) / 100,
      activeSubscriptions,
      failedPayments,
      trialingSubscriptions,
      pastDueSubscriptions,
    };
  }

  async recordEvent(_event: EventStore): Promise<void> {
    // Events are persisted in event_store; metrics are computed on demand.
  }

  private async calculateMrr(
    merchantId: string,
    subscriptions: Subscription[],
  ): Promise<number> {
    let mrr = 0;
    for (const sub of subscriptions) {
      const plan =
        sub.plan ??
        (await this.planRepo.findOne({
          where: { id: sub.planId, merchantId },
        }));
      if (!plan) continue;
      const amount = parseFloat(plan.amount);
      mrr += this.normalizeToMonthly(
        amount,
        plan.interval,
        plan.customIntervalDays,
      );
    }
    return mrr;
  }

  private normalizeToMonthly(
    amount: number,
    interval: PlanInterval,
    customDays?: number,
  ): number {
    switch (interval) {
      case PlanInterval.MONTHLY:
        return amount;
      case PlanInterval.QUARTERLY:
        return amount / 3;
      case PlanInterval.YEARLY:
        return amount / 12;
      case PlanInterval.CUSTOM:
        return (amount / (customDays ?? 30)) * 30;
      default:
        return amount;
    }
  }

  private async countCancelledLast30Days(merchantId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    return this.subscriptionRepo
      .createQueryBuilder('s')
      .where('s.merchantId = :merchantId', { merchantId })
      .andWhere('s.status = :status', { status: SubscriptionStatus.CANCELLED })
      .andWhere('s.cancelledAt >= :date', { date: thirtyDaysAgo })
      .getCount();
  }

  private async countActive30DaysAgo(merchantId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    return this.subscriptionRepo
      .createQueryBuilder('s')
      .where('s.merchantId = :merchantId', { merchantId })
      .andWhere('s.createdAt <= :date', { date: thirtyDaysAgo })
      .andWhere('s.status IN (:...statuses)', {
        statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
      })
      .getCount();
  }
}
