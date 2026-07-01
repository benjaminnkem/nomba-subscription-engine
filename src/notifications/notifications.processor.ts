import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queues/queue.constants';
import { NotificationsService } from './notifications.service';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  constructor(private notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<{ notificationId: string }>): Promise<void> {
    await this.notificationsService.send(job.data.notificationId);
  }
}
