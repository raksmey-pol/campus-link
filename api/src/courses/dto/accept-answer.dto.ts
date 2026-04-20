import { IsBoolean } from 'class-validator';

export class AcceptAnswerDto {
  @IsBoolean()
  is_accepted!: boolean;
}
  