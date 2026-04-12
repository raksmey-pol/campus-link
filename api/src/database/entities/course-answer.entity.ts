import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseQuestion } from './course-question.entity';
import { User } from './user.entity';

@Entity('course_answers')
export class CourseAnswer {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CourseQuestion, { nullable: false })
  @JoinColumn({ name: 'question_id' })
  question!: CourseQuestion;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text' })
  body!: string;

  @Column({ default: 0 })
  upvotes!: number;

  // Only the question author can accept an answer
  @Column({ default: false })
  is_accepted!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
