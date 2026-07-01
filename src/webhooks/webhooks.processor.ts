import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queues/queue.constants';
import { WebhooksService } from './webhooks.service';

@Processor(QUEUE_NAMES.WEBHOOKS)
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(private webhooksService: WebhooksService) {
    super();
  }

  async process(job: Job<{ deliveryId: string }>): Promise<void> {
    this.logger.log(`Delivering webhook ${job.data.deliveryId}`);
    await this.webhooksService.deliver(job.data.deliveryId);
  }
}
