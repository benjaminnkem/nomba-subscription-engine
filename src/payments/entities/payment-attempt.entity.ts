import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PaymentStatus } from '../../shared/enums';
import { Payment } from './payment.entity';

@Entity('payment_attempts')
export class PaymentAttempt extends BaseEntity {
  @Column({ type: 'uuid' })
  paymentId: string;

  @Column({ type: 'int' })
  attemptNumber: number;

  @Column({ type: 'enum', enum: PaymentStatus })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nombaTransactionId?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  failureReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  responsePayload?: Record<string, unknown>;

  @ManyToOne(() => Payment, (payment) => payment.attempts)
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;
}