import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VoteValue } from '../enums';
import { CourseResource } from './course-resource.entity';
import { User } from './user.entity';

@Entity('resource_votes')
@Index('UQ_resource_vote_user', ['resource', 'user'], { unique: true })
export class ResourceVote {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CourseResource, { nullable: false })
  @JoinColumn({ name: 'resource_id' })
  resource!: CourseResource;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: VoteValue })
  vote!: VoteValue;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
