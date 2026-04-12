import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { User } from './user.entity';

@Entity('course_mentors')
@Index('UQ_course_mentor_user', ['course', 'user'], { unique: true })
export class CourseMentor {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Course, { nullable: false })
  @JoinColumn({ name: 'course_id' })
  course!: Course;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  earned_at!: Date;

  @Column({ default: 0 })
  total_contributions!: number;
}
