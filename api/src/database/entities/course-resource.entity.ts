import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResourceStatus, ResourceType } from '../enums';
import { Course } from './course.entity';
import { User } from './user.entity';

@Entity('course_resources')
export class CourseResource {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Course, { nullable: false })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: ResourceType })
  type: ResourceType;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // S3/MinIO URL — for uploaded files (Notes, Assessments, Projects)
  @Column({ type: 'text', nullable: true })
  file_url: string | null;

  // External URL — for EXTERNAL_LINK type
  @Column({ type: 'text', nullable: true })
  link_url: string | null;

  @Column({ default: 0 })
  upvotes: number;

  @Column({ default: 0 })
  downvotes: number;

  @Column({
    type: 'enum',
    enum: ResourceStatus,
    default: ResourceStatus.PENDING,
  })
  status: ResourceStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
