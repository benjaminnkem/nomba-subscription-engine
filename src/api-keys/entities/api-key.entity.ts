import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiKeyEnvironment } from '../../shared/enums';
import { Merchant } from '../../merchants/entities/merchant.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  merchantId: string;

  @Column({ type: 'varchar', length: 20 })
  prefix: string;

  @Column({ type: 'varchar', length: 255 })
  keyHash: string;

  @Column({ type: 'varchar', length: 8 })
  lastFour: string;

  @Column({ type: 'enum', enum: ApiKeyEnvironment })
  environment: ApiKeyEnvironment;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @ManyToOne(() => Merchant, (merchant) => merchant.apiKeys)
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;
}
