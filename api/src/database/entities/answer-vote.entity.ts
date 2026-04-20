import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourseAnswer } from './course-answer.entity';
import { User } from './user.entity';
import { VoteType } from '../enums';

@Entity('answer_votes')
@Index('UQ_answer_vote_user', ['answer', 'user'], { unique: true })
export class AnswerVote {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CourseAnswer, { nullable: false })
  @JoinColumn({ name: 'answer_id' })
  answer!: CourseAnswer;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: VoteType,
    default: VoteType.UPVOTE,
  })
  vote_type!: VoteType;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
