import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueuesModule } from '../queues/queues.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { EventStore } from './entities/event-store.entity';
import { EventsProcessor } from './events.processor';
import { EventsService } from './events.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventStore]),
    QueuesModule,
    forwardRef(() => WebhooksModule),
    forwardRef(() => AnalyticsModule),
    forwardRef(() => NotificationsModule),
    AuditModule,
  ],
  providers: [EventsService, EventsProcessor],
  exports: [EventsService],
})
export class EventsModule {}
