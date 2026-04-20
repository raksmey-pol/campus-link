import { IsEnum } from 'class-validator';
import { VoteType } from '../../database/enums';

export class VoteAnswerDto {
  @IsEnum(VoteType)
  vote_type!: VoteType;
}
