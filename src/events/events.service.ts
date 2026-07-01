import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { QUEUE_NAMES } from '../queues/queue.constants';
import { DomainEventPayload, DomainEventType } from './domain-events';
import { EventStore } from './entities/event-store.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventStore)
    private eventRepo: Repository<EventStore>,
    @InjectQueue(QUEUE_NAMES.EVENTS) private eventsQueue: Queue,
  ) {}

  async emit(
    eventType: DomainEventType,
    payload: DomainEventPayload,
  ): Promise<EventStore> {
    const event = this.eventRepo.create({
      merchantId: payload.merchantId,
      eventType,
      aggregateType: payload.aggregateType,
      aggregateId: payload.aggregateId,
      payload: payload.data,
      processed: false,
    });
    const saved = await this.eventRepo.save(event);

    await this.eventsQueue.add(
      'process-event',
      { eventId: saved.id },
      { removeOnComplete: true },
    );

    return saved;
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.eventRepo.update(eventId, {
      processed: true,
      processedAt: new Date(),
    });
  }

  async findUnprocessed(limit = 100): Promise<EventStore[]> {
    return this.eventRepo.find({
      where: { processed: false },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }
}
