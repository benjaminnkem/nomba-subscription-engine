import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PaymentStatus } from '../../shared/enums';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { PaymentAttempt } from './payment-attempt.entity';

@Entity('payments')
export class Payment extends BaseEntity {
  @Column({ type: 'uuid' })
  invoiceId: string;

  @Column({ type: 'uuid', nullable: true })
  subscriptionId?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 3, default: 'NGN' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nombaTransactionId?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  failureReason?: string;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription?: Subscription;

  @OneToMany(() => PaymentAttempt, (attempt) => attempt.payment, { cascade: true })
  attempts: PaymentAttempt[];
}