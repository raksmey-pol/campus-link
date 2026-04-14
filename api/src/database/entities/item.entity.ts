import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ItemStatus, ValueTier } from '../enums';
import { User } from './user.entity';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn()
  id!: number;

  // Nullable to support guest (unauthenticated) found-item submissions
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reporter_id' })
  reporter!: User | null;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text' })
  photo_url!: string;

  @Column({ type: 'enum', enum: ValueTier })
  value_tier!: ValueTier;

  @Column({ type: 'enum', enum: ItemStatus, default: ItemStatus.PENDING })
  status!: ItemStatus;

  @Column({ length: 300 })
  location!: string;

  // Ensures Telegram broadcast idempotency — item never posted twice
  @Column({ type: 'bigint', unique: true, nullable: true })
  telegram_message_id!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'moderator_id' })
  moderator!: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at!: Date | null;

  // Resolve handoff confirmation flags — both must be true to mark item RESOLVED
  @Column({ default: false })
  finder_confirmed!: boolean;

  @Column({ default: false })
  claimer_confirmed!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
