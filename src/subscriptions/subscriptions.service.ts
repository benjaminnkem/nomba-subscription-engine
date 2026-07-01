import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProrationService } from '../billing/proration.service';
import { CustomersService } from '../customers/customers.service';
import { DOMAIN_EVENTS } from '../events/domain-events';
import { EventsService } from '../events/events.service';
import { PlansService } from '../plans/plans.service';
import { AuditAction, SubscriptionStatus } from '../shared/enums';
import { AuditService } from '../audit/audit.service';
import { ChangePlanDto } from './dto/change-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionStateMachine } from './subscription-state.machine';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    private plansService: PlansService,
    private customersService: CustomersService,
    private prorationService: ProrationService,
    private eventsService: EventsService,
    private auditService: AuditService,
  ) {}

  async create(
    merchantId: string,
    dto: CreateSubscriptionDto,
    actor: string,
  ): Promise<Subscription> {
    const [plan, customer] = await Promise.all([
      this.plansService.findOne(merchantId, dto.planId),
      this.customersService.findOne(merchantId, dto.customerId),
    ]);

    const now = new Date();

    const intervalDays = this.prorationService.getIntervalDays(
      plan.interval,
      plan.customIntervalDays,
    );
    const periodEnd = new Date(now.getTime() + intervalDays * 86400000);

    let status = SubscriptionStatus.ACTIVE;
    let trialEndsAt: Date | null = null;
    if (plan.trialDays > 0) {
      status = SubscriptionStatus.TRIALING;
      trialEndsAt = new Date(now.getTime() + plan.trialDays * 86400000);
    }

    const subscription = this.subscriptionRepo.create({
      merchantId,
      customerId: customer.id,
      planId: plan.id,
      status,
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      metadata: dto.metadata,
    });
    const saved = await this.subscriptionRepo.save(subscription);

    await this.eventsService.emit(DOMAIN_EVENTS.SUBSCRIPTION_CREATED, {
      merchantId,
      aggregateType: 'subscription',
      aggregateId: saved.id,
      data: { subscription: saved, customer, plan },
    });

    await this.auditService.log({
      merchantId,
      actor,
      action: AuditAction.CREATE,
      resourceType: 'subscription',
      resourceId: saved.id,
    });

    return saved;
  }

  async findAll(merchantId: string): Promise<Subscription[]> {
    return this.subscriptionRepo.find({
      where: { merchantId },
      relations: { customer: true, plan: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(merchantId: string, id: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id, merchantId },
      relations: { customer: true, plan: true },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  async pause(
    merchantId: string,
    id: string,
    actor: string,
  ): Promise<Subscription> {
    const subscription = await this.findOne(merchantId, id);
    SubscriptionStateMachine.assertTransition(
      subscription.status,
      SubscriptionStatus.SUSPENDED,
    );
    subscription.status = SubscriptionStatus.SUSPENDED;
    subscription.pausedAt = new Date();
    const updated = await this.subscriptionRepo.save(subscription);
    await this.emitUpdated(merchantId, updated, actor, AuditAction.PAUSE);
    return updated;
  }

  async resume(
    merchantId: string,
    id: string,
    actor: string,
  ): Promise<Subscription> {
    const subscription = await this.findOne(merchantId, id);
    SubscriptionStateMachine.assertTransition(
      subscription.status,
      SubscriptionStatus.ACTIVE,
    );
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.pausedAt = null;
    const updated = await this.subscriptionRepo.save(subscription);
    await this.emitUpdated(merchantId, updated, actor, AuditAction.RESUME);
    return updated;
  }

  async cancel(
    merchantId: string,
    id: string,
    actor: string,
  ): Promise<Subscription> {
    const subscription = await this.findOne(merchantId, id);
    SubscriptionStateMachine.assertTransition(
      subscription.status,
      SubscriptionStatus.CANCELLED,
    );
    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    const updated = await this.subscriptionRepo.save(subscription);

    await this.eventsService.emit(DOMAIN_EVENTS.SUBSCRIPTION_CANCELLED, {
      merchantId,
      aggregateType: 'subscription',
      aggregateId: updated.id,
      data: { subscription: updated },
    });

    await this.auditService.log({
      merchantId,
      actor,
      action: AuditAction.CANCEL,
      resourceType: 'subscription',
      resourceId: id,
    });

    return updated;
  }

  async reactivate(
    merchantId: string,
    id: string,
    actor: string,
  ): Promise<Subscription> {
    const subscription = await this.findOne(merchantId, id);
    SubscriptionStateMachine.assertTransition(
      subscription.status,
      SubscriptionStatus.ACTIVE,
    );
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.cancelledAt = null;
    const updated = await this.subscriptionRepo.save(subscription);
    await this.emitUpdated(merchantId, updated, actor, AuditAction.UPDATE);
    return updated;
  }

  async changePlan(
    merchantId: string,
    id: string,
    dto: ChangePlanDto,
    actor: string,
  ): Promise<{
    subscription: Subscription;
    proration: ReturnType<ProrationService['calculateUpgrade']>;
  }> {
    const subscription = await this.findOne(merchantId, id);
    const currentPlan = subscription.plan;
    const newPlan = await this.plansService.findOne(merchantId, dto.newPlanId);

    const proration =
      parseFloat(newPlan.amount) >= parseFloat(currentPlan.amount)
        ? this.prorationService.calculateUpgrade({
            currentPlanAmount: parseFloat(currentPlan.amount),
            newPlanAmount: parseFloat(newPlan.amount),
            periodStart: subscription.currentPeriodStart,
            periodEnd: subscription.currentPeriodEnd,
          })
        : this.prorationService.calculateDowngrade({
            currentPlanAmount: parseFloat(currentPlan.amount),
            newPlanAmount: parseFloat(newPlan.amount),
            periodStart: subscription.currentPeriodStart,
            periodEnd: subscription.currentPeriodEnd,
          });

    subscription.planId = newPlan.id;
    const updated = await this.subscriptionRepo.save(subscription);
    await this.emitUpdated(merchantId, updated, actor, AuditAction.UPDATE);

    return { subscription: updated, proration };
  }

  async transitionStatus(
    subscription: Subscription,
    newStatus: SubscriptionStatus,
  ): Promise<Subscription> {
    SubscriptionStateMachine.assertTransition(subscription.status, newStatus);
    subscription.status = newStatus;
    return this.subscriptionRepo.save(subscription);
  }

  async findDueForBilling(): Promise<Subscription[]> {
    const now = new Date();
    return this.subscriptionRepo
      .createQueryBuilder('s')
      .where('s.currentPeriodEnd <= :now', { now })
      .andWhere('s.status IN (:...statuses)', {
        statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
      })
      .getMany();
  }

  private async emitUpdated(
    merchantId: string,
    subscription: Subscription,
    actor: string,
    action: AuditAction,
  ) {
    await this.eventsService.emit(DOMAIN_EVENTS.SUBSCRIPTION_UPDATED, {
      merchantId,
      aggregateType: 'subscription',
      aggregateId: subscription.id,
      data: { subscription },
    });
    await this.auditService.log({
      merchantId,
      actor,
      action,
      resourceType: 'subscription',
      resourceId: subscription.id,
    });
  }
}
