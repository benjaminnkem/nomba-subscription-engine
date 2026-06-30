import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiKey } from '../../api-keys/entities/api-key.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  businessName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'jsonb', nullable: true })
  branding?: Record<string, unknown>;

  @Column({ type: 'varchar', length: 500, nullable: true })
  webhookUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  webhookSecret?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @OneToMany(() => User, (user) => user.merchant)
  users: User[];

  @OneToMany(() => ApiKey, (apiKey) => apiKey.merchant)
  apiKeys: ApiKey[];
}
