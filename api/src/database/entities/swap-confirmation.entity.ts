import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SwapMatch } from './swap-match.entity';
import { User } from './user.entity';

@Entity('swap_confirmations')
@Index('UQ_swap_confirmation_user', ['match', 'user'], { unique: true })
export class SwapConfirmation {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => SwapMatch, { nullable: false })
  @JoinColumn({ name: 'match_id' })
  match!: SwapMatch;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  confirmed_at!: Date;
}
