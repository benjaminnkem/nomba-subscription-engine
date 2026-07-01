import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { EventStore } from '../events/entities/event-store.entity';
import { QUEUE_NAMES } from '../queues/queue.constants';
import { WebhookDeliveryStatus, WebhookEventType } from '../shared/enums';
import { generateRandomToken, signHmacSha256 } from '../shared/utils';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { Webhook } from './entities/webhook.entity';

const EVENT_TYPE_MAP: Record<string, WebhookEventType> = {
  SubscriptionCreatedEvent: WebhookEventType.SUBSCRIPTION_CREATED,
  SubscriptionUpdatedEvent: WebhookEventType.SUBSCRIPTION_UPDATED,
  SubscriptionCancelledEvent: WebhookEventType.SUBSCRIPTION_CANCELLED,
  SubscriptionRenewedEvent: WebhookEventType.SUBSCRIPTION_RENEWED,
  PaymentFailedEvent: WebhookEventType.PAYMENT_FAILED,
  PaymentRecoveredEvent: WebhookEventType.PAYMENT_RECOVERED,
  InvoicePaidEvent: WebhookEventType.INVOICE_PAID,
};

const RETRY_DELAYS_MS = [60000, 300000, 900000, 3600000, 14400000];

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook) private webhookRepo: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private deliveryRepo: Repository<WebhookDelivery>,
    @InjectQueue(QUEUE_NAMES.WEBHOOKS) private webhooksQueue: Queue,
  ) {}

  async create(merchantId: string, dto: CreateWebhookDto): Promise<Webhook> {
    const webhook = this.webhookRepo.create({
      merchantId,
      url: dto.url,
      secret: generateRandomToken(32),
      events: dto.events,
      description: dto.description,
      isActive: dto.isActive ?? true,
    });
    return this.webhookRepo.save(webhook);
  }

  async findAll(merchantId: string): Promise<Webhook[]> {
    return this.webhookRepo.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findDeliveries(
    merchantId: string,
    webhookId: string,
  ): Promise<WebhookDelivery[]> {
    return this.deliveryRepo.find({
      where: { merchantId, webhookId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async dispatchForEvent(event: EventStore): Promise<void> {
    const eventType = EVENT_TYPE_MAP[event.eventType];
    if (!eventType) return;

    const webhooks = await this.webhookRepo.find({
      where: { merchantId: event.merchantId, isActive: true },
    });

    for (const webhook of webhooks) {
      if (!webhook.events.includes(eventType)) continue;

      const delivery = this.deliveryRepo.create({
        merchantId: event.merchantId,
        webhookId: webhook.id,
        eventType,
        payload: {
          id: event.id,
          type: eventType,
          data: event.payload,
          createdAt: event.createdAt,
        },
        status: WebhookDeliveryStatus.PENDING,
      });
      const saved = await this.deliveryRepo.save(delivery);

      await this.webhooksQueue.add(
        'deliver-webhook',
        { deliveryId: saved.id },
        { removeOnComplete: true },
      );
    }
  }

  async deliver(deliveryId: string): Promise<void> {
    const delivery = await this.deliveryRepo.findOne({
      where: { id: deliveryId },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');

    const webhook = await this.webhookRepo.findOne({
      where: { id: delivery.webhookId },
    });
    if (!webhook) return;

    const body = JSON.stringify(delivery.payload);
    const signature = signHmacSha256(body, webhook.secret);
    const timestamp = Date.now().toString();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
          'x-timestamp': timestamp,
          'x-event-type': delivery.eventType,
        },
        body,
      });

      delivery.responseStatusCode = response.status;
      delivery.responseBody = await response.text();
      delivery.attemptCount += 1;

      if (response.ok) {
        delivery.status = WebhookDeliveryStatus.DELIVERED;
        delivery.deliveredAt = new Date();
      } else {
        await this.scheduleRetry(delivery);
      }
    } catch (error) {
      delivery.attemptCount += 1;
      delivery.responseBody =
        error instanceof Error ? error.message : 'Delivery failed';
      await this.scheduleRetry(delivery);
    }

    await this.deliveryRepo.save(delivery);
  }

  private async scheduleRetry(delivery: WebhookDelivery): Promise<void> {
    const maxAttempts = RETRY_DELAYS_MS.length;
    if (delivery.attemptCount >= maxAttempts) {
      delivery.status = WebhookDeliveryStatus.DEAD_LETTER;
      return;
    }

    delivery.status = WebhookDeliveryStatus.FAILED;
    const delay = RETRY_DELAYS_MS[delivery.attemptCount - 1];
    delivery.nextRetryAt = new Date(Date.now() + delay);

    await this.webhooksQueue.add(
      'deliver-webhook',
      { deliveryId: delivery.id },
      { delay, removeOnComplete: true },
    );
  }
}
