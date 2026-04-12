import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MatchStatus, MatchType } from '../enums';
import { SwapRequest } from './swap-request.entity';

@Entity('swap_matches')
export class SwapMatch {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => SwapRequest, { nullable: false })
  @JoinColumn({ name: 'request_a_id' })
  requestA!: SwapRequest;

  @ManyToOne(() => SwapRequest, { nullable: false })
  @JoinColumn({ name: 'request_b_id' })
  requestB!: SwapRequest;

  // Only populated for CHAIN (3-way) matches
  @ManyToOne(() => SwapRequest, { nullable: true })
  @JoinColumn({ name: 'request_c_id' })
  requestC!: SwapRequest | null;

  @Column({ type: 'enum', enum: MatchType })
  match_type!: MatchType;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.PROPOSED })
  status!: MatchStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
