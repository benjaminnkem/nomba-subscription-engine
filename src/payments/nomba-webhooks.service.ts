import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProrationService } from '../billing/proration.service';
import { DOMAIN_EVENTS } from '../events/domain-events';
import { EventsService } from '../events/events.service';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { Plan } from '../plans/entities/plan.entity';
import { PaymentStatus, SubscriptionStatus } from '../shared/enums';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CustomersService } from '../customers/customers.service';
import { DunningService } from '../dunning/dunning.service';
import { NombaWebhookEvent } from './entities/nomba-webhook-event.entity';
import { PaymentAttempt } from './entities/payment-attempt.entity';
import { Payment } from './entities/payment.entity';
import { verifyNombaSignature } from './nomba-signature.util';
import {
  NombaWebhookHeaders,
  NombaWebhookPayload,
} from './nomba-webhook.types';

@Injectable()
export class NombaWebhooksService {
  private readonly logger = new Logger(NombaWebhooksService.name);

  constructor(
    @InjectRepository(NombaWebhookEvent)
    private webhookEventRepo: Repository<NombaWebhookEvent>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentAttempt)
    private attemptRepo: Repository<PaymentAttempt>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private planRepo: Repository<Plan>,
    private config: ConfigService,
    private invoicesService: InvoicesService,
    private subscriptionsService: SubscriptionsService,
    private prorationService: ProrationService,
    private eventsService: EventsService,
    private dunningService: DunningService,
    private customersService: CustomersService,
  ) {}

  async process(
    payload: NombaWebhookPayload,
    headers: NombaWebhookHeaders,
  ): Promise<{ received: true }> {
    this.verifySignature(payload, headers);

    const requestId = payload.requestId ?? payload.request_id;
    if (!requestId) {
      this.logger.warn('Nomba webhook missing requestId');
      return { received: true };
    }

    const existing = await this.webhookEventRepo.findOne({
      where: { requestId },
    });
    if (existing) {
      this.logger.log(`Duplicate Nomba webhook ignored: ${requestId}`);
      return { received: true };
    }

    switch (payload.event_type) {
      case 'payment_success':
        await this.handlePaymentSuccess(payload, requestId);
        break;
      case 'payment_failed':
        await this.handlePaymentFailed(payload, requestId);
        break;
      case 'payment_reversal':
        await this.handlePaymentReversal(payload, requestId);
        break;
      default:
        this.logger.log(`Unhandled Nomba event type: ${payload.event_type}`);
        await this.recordEvent(
          requestId,
          payload.event_type,
          payload,
          undefined,
        );
    }

    return { received: true };
  }

  private verifySignature(
    payload: NombaWebhookPayload,
    headers: NombaWebhookHeaders,
  ): void {
    const secret = this.config.get<string>('nomba.webhookSecret');
    const nodeEnv = this.config.get<string>('nodeEnv');

    if (!secret) {
      if (nodeEnv === 'production') {
        throw new UnauthorizedException(
          'Nomba webhook secret is not configured',
        );
      }
      this.logger.warn(
        'NOMBA_WEBHOOK_SECRET not set — skipping signature verification',
      );
      return;
    }

    const signature = headers.signature;
    const timestamp = headers.timestamp;

    if (
      !signature ||
      !timestamp ||
      !verifyNombaSignature(payload, secret, signature, timestamp)
    ) {
      throw new UnauthorizedException('Invalid Nomba webhook signature');
    }
  }

  private async handlePaymentSuccess(
    payload: NombaWebhookPayload,
    requestId: string,
  ): Promise<void> {
    const payment = await this.resolvePayment(payload);

    if (!payment) {
      this.logger.warn(
        `payment_success webhook could not be matched to a payment (${requestId})`,
      );
      await this.recordEvent(requestId, payload.event_type, payload, undefined);
      return;
    }

    if (payment.status === PaymentStatus.SUCCEEDED) {
      await this.recordEvent(requestId, payload.event_type, payload, payment);
      return;
    }

    const transactionId = payload.data.transaction?.transactionId;
    const wasFailed = payment.status === PaymentStatus.FAILED;

    payment.status = PaymentStatus.SUCCEEDED;
    payment.nombaTransactionId = transactionId ?? payment.nombaTransactionId;
    payment.failureReason = undefined;
    payment.paidAt = new Date();
    await this.paymentRepo.save(payment);

    const attemptCount = await this.attemptRepo.count({
      where: { paymentId: payment.id },
    });
    await this.attemptRepo.save(
      this.attemptRepo.create({
        merchantId: payment.merchantId,
        paymentId: payment.id,
        attemptNumber: attemptCount + 1,
        status: PaymentStatus.SUCCEEDED,
        nombaTransactionId: transactionId,
        responsePayload: payload as unknown as Record<string, unknown>,
      }),
    );

    const invoice = await this.invoiceRepo.findOne({
      where: { id: payment.invoiceId, merchantId: payment.merchantId },
    });
    if (!invoice) {
      await this.recordEvent(requestId, payload.event_type, payload, payment);
      return;
    }

    await this.invoicesService.markPaid(invoice);

    let subscription: Subscription | null = null;
    let previousSubscriptionStatus: SubscriptionStatus | null = null;
    if (payment.subscriptionId) {
      subscription = await this.subscriptionRepo.findOne({
        where: { id: payment.subscriptionId, merchantId: payment.merchantId },
      });

      if (subscription) {
        previousSubscriptionStatus = subscription.status;
        const plan = await this.planRepo.findOne({
          where: { id: subscription.planId, merchantId: payment.merchantId },
        });

        if (plan) {
          const now = new Date();
          subscription.currentPeriodStart = now;
          subscription.dunningAttemptCount = 0;

          if (
            previousSubscriptionStatus === SubscriptionStatus.PENDING &&
            plan.trialDays > 0
          ) {
            subscription.trialEndsAt = new Date(
              now.getTime() + plan.trialDays * 86400000,
            );
            subscription.currentPeriodEnd = subscription.trialEndsAt;
          } else {
            const intervalDays = this.prorationService.getIntervalDays(
              plan.interval,
              plan.customIntervalDays,
            );
            subscription.currentPeriodEnd = new Date(
              now.getTime() + intervalDays * 86400000,
            );
          }
        }

        if (previousSubscriptionStatus === SubscriptionStatus.PENDING) {
          const targetStatus =
            plan && plan.trialDays > 0
              ? SubscriptionStatus.TRIALING
              : SubscriptionStatus.ACTIVE;
          await this.subscriptionsService.transitionStatus(
            subscription,
            targetStatus,
          );
        } else if (subscription.status !== SubscriptionStatus.ACTIVE) {
          await this.subscriptionsService.transitionStatus(
            subscription,
            SubscriptionStatus.ACTIVE,
          );
        } else {
          await this.subscriptionRepo.save(subscription);
        }
      }
    }

    await this.eventsService.emit(DOMAIN_EVENTS.INVOICE_PAID, {
      merchantId: payment.merchantId,
      aggregateType: 'invoice',
      aggregateId: invoice.id,
      data: { invoice, payment, subscription },
    });

    if (subscription) {
      if (wasFailed) {
        await this.eventsService.emit(DOMAIN_EVENTS.PAYMENT_RECOVERED, {
          merchantId: payment.merchantId,
          aggregateType: 'payment',
          aggregateId: payment.id,
          data: { payment, invoice },
        });
      } else if (previousSubscriptionStatus === SubscriptionStatus.PENDING) {
        await this.eventsService.emit(DOMAIN_EVENTS.SUBSCRIPTION_UPDATED, {
          merchantId: payment.merchantId,
          aggregateType: 'subscription',
          aggregateId: subscription.id,
          data: { subscription, invoice, activated: true },
        });
      } else {
        await this.eventsService.emit(DOMAIN_EVENTS.SUBSCRIPTION_RENEWED, {
          merchantId: payment.merchantId,
          aggregateType: 'subscription',
          aggregateId: subscription.id,
          data: { subscription, invoice },
        });
      }
    }

    await this.persistCardToken(payload, payment);

    await this.recordEvent(requestId, payload.event_type, payload, payment);
  }

  private async handlePaymentFailed(
    payload: NombaWebhookPayload,
    requestId: string,
  ): Promise<void> {
    const payment = await this.resolvePayment(payload);
    if (!payment) {
      this.logger.warn(
        `payment_failed webhook could not be matched to a payment (${requestId})`,
      );
      await this.recordEvent(requestId, payload.event_type, payload, undefined);
      return;
    }

    if (
      payment.status === PaymentStatus.FAILED ||
      payment.status === PaymentStatus.SUCCEEDED
    ) {
      await this.recordEvent(requestId, payload.event_type, payload, payment);
      return;
    }

    const failureReason =
      payload.data.transaction?.responseCodeMessage ??
      payload.data.transaction?.responseCode ??
      'Payment failed';

    payment.status = PaymentStatus.FAILED;
    payment.failureReason = failureReason;
    payment.nombaTransactionId =
      payload.data.transaction?.transactionId ?? payment.nombaTransactionId;
    await this.paymentRepo.save(payment);

    const attemptCount = await this.attemptRepo.count({
      where: { paymentId: payment.id },
    });
    await this.attemptRepo.save(
      this.attemptRepo.create({
        merchantId: payment.merchantId,
        paymentId: payment.id,
        attemptNumber: attemptCount + 1,
        status: PaymentStatus.FAILED,
        nombaTransactionId: payload.data.transaction?.transactionId,
        failureReason,
        responsePayload: payload as unknown as Record<string, unknown>,
      }),
    );

    const invoice = await this.invoiceRepo.findOne({
      where: { id: payment.invoiceId, merchantId: payment.merchantId },
    });
    if (invoice) {
      await this.invoicesService.markFailed(invoice);
    }

    if (payment.subscriptionId) {
      const subscription = await this.subscriptionRepo.findOne({
        where: { id: payment.subscriptionId, merchantId: payment.merchantId },
      });
      if (subscription && subscription.status !== SubscriptionStatus.PENDING) {
        await this.subscriptionsService.transitionStatus(
          subscription,
          SubscriptionStatus.PAST_DUE,
        );
        await this.dunningService.onPaymentFailed(subscription.id);
      }
    }

    if (invoice) {
      await this.eventsService.emit(DOMAIN_EVENTS.PAYMENT_FAILED, {
        merchantId: payment.merchantId,
        aggregateType: 'payment',
        aggregateId: payment.id,
        data: { payment, invoice },
      });
    }

    await this.recordEvent(requestId, payload.event_type, payload, payment);
  }

  private async handlePaymentReversal(
    payload: NombaWebhookPayload,
    requestId: string,
  ): Promise<void> {
    const payment = await this.resolvePayment(payload);
    if (!payment) {
      this.logger.warn(
        `payment_reversal webhook could not be matched to a payment (${requestId})`,
      );
      await this.recordEvent(requestId, payload.event_type, payload, undefined);
      return;
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.nombaTransactionId =
      payload.data.transaction?.transactionId ?? payment.nombaTransactionId;
    await this.paymentRepo.save(payment);

    await this.recordEvent(requestId, payload.event_type, payload, payment);
  }

  private async resolvePayment(
    payload: NombaWebhookPayload,
  ): Promise<Payment | null> {
    const transaction = payload.data.transaction;
    const order = payload.data.order;

    const references = [
      order?.orderReference,
      transaction?.merchantTxRef,
      transaction?.aliasAccountReference,
    ].filter((value): value is string => Boolean(value));

    for (const reference of references) {
      const payment = await this.paymentRepo.findOne({
        where: { id: reference },
      });
      if (payment) {
        return payment;
      }

      const merchantTxMatch = reference.match(
        /^sub_([0-9a-f-]{36})_attempt_\d+$/i,
      );
      if (merchantTxMatch) {
        const paymentByRef = await this.paymentRepo.findOne({
          where: { id: merchantTxMatch[1] },
        });
        if (paymentByRef) {
          return paymentByRef;
        }
      }
    }

    if (transaction?.transactionId) {
      return this.paymentRepo.findOne({
        where: { nombaTransactionId: transaction.transactionId },
      });
    }

    return null;
  }

  private async persistCardToken(
    payload: NombaWebhookPayload,
    payment: Payment,
  ): Promise<void> {
    const cardToken =
      payload.data.customer?.cardId ?? payload.data.customer?.tokenId;

    if (!cardToken) {
      return;
    }

    const invoice = await this.invoiceRepo.findOne({
      where: { id: payment.invoiceId, merchantId: payment.merchantId },
    });
    if (!invoice) {
      return;
    }

    await this.customersService.saveNombaCardToken(
      payment.merchantId,
      invoice.customerId,
      cardToken,
    );
  }

  private async recordEvent(
    requestId: string,
    eventType: string,
    payload: NombaWebhookPayload,
    payment: Payment | undefined,
  ): Promise<void> {
    await this.webhookEventRepo.save(
      this.webhookEventRepo.create({
        requestId,
        eventType,
        merchantId: payment?.merchantId,
        paymentId: payment?.id,
        payload: payload as unknown as Record<string, unknown>,
      }),
    );
  }
}
