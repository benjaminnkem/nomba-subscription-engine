import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('nomba_webhook_events')
export class NombaWebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  requestId: string;

  @Column({ type: 'varchar', length: 100 })
  eventType: string;

  @Column({ type: 'uuid', nullable: true })
  merchantId?: string;

  @Column({ type: 'uuid', nullable: true })
  paymentId?: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}