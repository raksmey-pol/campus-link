import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReviewStatus } from '../enums';
import { Course } from './course.entity';
import { User } from './user.entity';

@Entity('course_reviews')
@Index('UQ_course_review_user', ['course', 'user'], { unique: true })
export class CourseReview {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Course, { nullable: false })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  difficulty: number;

  @Column({ type: 'numeric', precision: 4, scale: 1 })
  workload_hours: number;

  @Column()
  quality: number;

  @Column()
  usefulness: number;

  @Column()
  recommendation: number;

  @Column({ type: 'text', nullable: true })
  review_text: string | null;

  @Column({ default: false })
  is_anonymous: boolean;

  @Column({ default: 0 })
  helpfulness_votes: number;

  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PENDING })
  status: ReviewStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
