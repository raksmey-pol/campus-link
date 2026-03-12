import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { User } from './user.entity';

@Entity('course_questions')
export class CourseQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Course, { nullable: false })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 300 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: 0 })
  view_count: number;

  @Column({ default: 0 })
  answer_count: number;

  // Only MENTOR or MODERATOR can pin
  @Column({ default: false })
  is_pinned: boolean;

  @Column({ default: false })
  is_closed: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
