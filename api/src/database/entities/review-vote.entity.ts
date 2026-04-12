import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourseReview } from './course-review.entity';
import { User } from './user.entity';

@Entity('review_votes')
@Index('UQ_review_vote_user', ['review', 'user'], { unique: true })
export class ReviewVote {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CourseReview, { nullable: false })
  @JoinColumn({ name: 'review_id' })
  review!: CourseReview;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  is_helpful!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
