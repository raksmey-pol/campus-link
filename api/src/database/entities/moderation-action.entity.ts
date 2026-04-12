import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ModerationActionType, ModerationTarget } from '../enums';
import { User } from './user.entity';

@Entity('moderation_actions')
export class ModerationAction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'moderator_id' })
  moderator!: User;

  @Column({ type: 'enum', enum: ModerationTarget })
  target_type!: ModerationTarget;

  // Polymorphic target — not a typed TypeORM relation
  @Column()
  target_id!: number;

  @Column({ type: 'enum', enum: ModerationActionType })
  action!: ModerationActionType;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  // AI confidence score from NLP classifier (0.0000–1.0000)
  @Column({ type: 'numeric', precision: 5, scale: 4, nullable: true })
  spam_score!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
