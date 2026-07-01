import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { EventStore } from '../events/entities/event-store.entity';
import { QUEUE_NAMES } from '../queues/queue.constants';
import { NotificationChannel, NotificationStatus } from '../shared/enums';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private notificationsQueue: Queue,
  ) {}

  async queueForEvent(event: EventStore): Promise<void> {
    const recipient =
      (event.payload.customerEmail as string) ??
      (event.payload.email as string);
    if (!recipient) return;

    const notification = this.notificationRepo.create({
      merchantId: event.merchantId,
      channel: NotificationChannel.EMAIL,
      recipient,
      subject: `Nomba Subscription: ${event.eventType}`,
      body: JSON.stringify(event.payload, null, 2),
      eventType: event.eventType,
      metadata: { eventId: event.id },
    });
    const saved = await this.notificationRepo.save(notification);

    await this.notificationsQueue.add(
      'send-notification',
      { notificationId: saved.id },
      { removeOnComplete: true },
    );
  }

  async send(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notification) return;

    try {
      if (notification.channel === NotificationChannel.EMAIL) {
        await this.sendEmail(notification);
      } else if (notification.channel === NotificationChannel.SMS) {
        await this.sendSms(notification);
      }
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
    } catch (error) {
      this.logger.error('Notification delivery failed', error);
      notification.status = NotificationStatus.FAILED;
    }

    await this.notificationRepo.save(notification);
  }

  private async sendEmail(notification: Notification): Promise<void> {
    this.logger.log(
      `[EMAIL] To: ${notification.recipient} | Subject: ${notification.subject}`,
    );
  }

  private async sendSms(notification: Notification): Promise<void> {
    this.logger.log(`[SMS] To: ${notification.recipient}`);
  }
}
