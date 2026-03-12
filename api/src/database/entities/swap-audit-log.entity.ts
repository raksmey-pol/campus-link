import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SwapStatus } from '../enums';
import { SwapRequest } from './swap-request.entity';
import { User } from './user.entity';

@Entity('swap_audit_log')
export class SwapAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SwapRequest, { nullable: false })
  @JoinColumn({ name: 'swap_request_id' })
  swapRequest: SwapRequest;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ type: 'enum', enum: SwapStatus })
  from_status: SwapStatus;

  @Column({ type: 'enum', enum: SwapStatus })
  to_status: SwapStatus;

  // Additional context: match_id, reason for cancel, etc.
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
