import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PointType } from '../enums';
import { User } from './user.entity';

@Entity('point_transactions')
export class PointTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  amount!: number;

  @Column({ type: 'enum', enum: PointType })
  type!: PointType;

  // Polymorphic reference — not a typed TypeORM relation
  @Column({ type: 'integer', nullable: true })
  reference_id!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
