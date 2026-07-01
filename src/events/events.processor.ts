import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queues/queue.constants';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { EventsService } from './events.service';
import { EventStore } from './entities/event-store.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction } from '../shared/enums';

@Processor(QUEUE_NAMES.EVENTS)
export class EventsProcessor extends WorkerHost {
  private readonly logger = new Logger(EventsProcessor.name);

  constructor(
    @InjectRepository(EventStore)
    private eventRepo: Repository<EventStore>,
    private eventsService: EventsService,
    private webhooksService: WebhooksService,
    private analyticsService: AnalyticsService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<{ eventId: string }>): Promise<void> {
    const event = await this.eventRepo.findOne({
      where: { id: job.data.eventId },
    });
    if (!event || event.processed) return;

    this.logger.log(`Processing event ${event.eventType} (${event.id})`);

    await this.webhooksService.dispatchForEvent(event);
    await this.analyticsService.recordEvent(event);
    await this.notificationsService.queueForEvent(event);

    await this.auditService.log({
      merchantId: event.merchantId,
      actor: 'system',
      action: AuditAction.WEBHOOK,
      resourceType: 'event',
      resourceId: event.id,
      metadata: { eventType: event.eventType },
    });

    await this.eventsService.markProcessed(event.id);
  }
}
