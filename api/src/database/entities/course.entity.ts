import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  code: string;

  @Column({ length: 200 })
  title: string;

  @Column()
  credits: number;

  @Column({ length: 100 })
  department: string;

  @Column({ type: 'text', nullable: true })
  prerequisites: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Precomputed aggregate scores (1.00–5.00)
  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  avg_difficulty: number;

  @Column({ type: 'numeric', precision: 4, scale: 1, default: 0 })
  avg_workload: number;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  avg_quality: number;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  avg_usefulness: number;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  avg_recommendation: number;

  @Column({ default: 0 })
  review_count: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
