import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SwapStatus, SwapType } from '../enums';
import { Course } from './course.entity';
import { User } from './user.entity';

// Note: A partial unique index on (requester_id, current_course_id)
// WHERE status IN ('OPEN', 'MATCHED') is required to prevent duplicate
// active requests. Create this manually via migration:
//   CREATE UNIQUE INDEX UQ_swap_active_per_course
//   ON swap_requests (requester_id, current_course_id)
//   WHERE status IN ('OPEN', 'MATCHED');

@Entity('swap_requests')
export class SwapRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'requester_id' })
  requester!: User;

  @Column({ type: 'enum', enum: SwapType })
  swap_type!: SwapType;

  @ManyToOne(() => Course, { nullable: false })
  @JoinColumn({ name: 'current_course_id' })
  current_course!: Course;

  // e.g. A, B, C — NULL means course-level swap
  @Column({ type: 'varchar', length: 10, nullable: true })
  current_section!: string | null;

  // Same as current for section swap; different for course swap
  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'desired_course_id' })
  desired_course!: Course | null;

  // NULL means any section is acceptable
  @Column({ type: 'varchar', length: 10, nullable: true })
  desired_section!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'enum', enum: SwapStatus, default: SwapStatus.OPEN })
  status!: SwapStatus;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cooldown_until!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
