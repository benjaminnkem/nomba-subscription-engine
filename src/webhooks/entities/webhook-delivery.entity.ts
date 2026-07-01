import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { WebhookDeliveryStatus, WebhookEventType } from '../../shared/enums';
import { Webhook } from './webhook.entity';

@Entity('webhook_deliveries')
export class WebhookDelivery extends BaseEntity {
  @Column({ type: 'uuid' })
  webhookId: string;

  @Column({ type: 'varchar', length: 100 })
  eventType: WebhookEventType;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: WebhookDeliveryStatus,
    default: WebhookDeliveryStatus.PENDING,
  })
  status: WebhookDeliveryStatus;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'int', nullable: true })
  responseStatusCode?: number;

  @Column({ type: 'text', nullable: true })
  responseBody?: string;

  @Column({ type: 'timestamptz', nullable: true })
  nextRetryAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt?: Date | null;

  @ManyToOne(() => Webhook)
  @JoinColumn({ name: 'webhookId' })
  webhook: Webhook;
}
