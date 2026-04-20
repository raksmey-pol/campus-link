import { VoteValue } from '../../database/enums';
import { IsEnum } from 'class-validator';

export class VoteResourceDto {
  @IsEnum(VoteValue)
  vote!: VoteValue;
}
