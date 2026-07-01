import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queues/queue.constants';
import { DunningService } from './dunning.service';

@Processor(QUEUE_NAMES.DUNNING)
export class DunningProcessor extends WorkerHost {
  private readonly logger = new Logger(DunningProcessor.name);

  constructor(private dunningService: DunningService) {
    super();
  }

  async process(
    job: Job<{ subscriptionId: string; attemptNumber: number }>,
  ): Promise<void> {
    this.logger.log(
      `Processing dunning job for subscription ${job.data.subscriptionId}`,
    );
    await this.dunningService.processRetry(
      job.data.subscriptionId,
      job.data.attemptNumber,
    );
  }
}
