import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PlanInterval } from '../../shared/enums';

@Entity('plans')
export class Plan extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 3, default: 'NGN' })
  currency: string;

  @Column({ type: 'enum', enum: PlanInterval, default: PlanInterval.MONTHLY })
  interval: PlanInterval;

  @Column({ type: 'int', nullable: true, default: 0 })
  trialDays: number;

  @Column({ type: 'int', nullable: true })
  customIntervalDays?: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
