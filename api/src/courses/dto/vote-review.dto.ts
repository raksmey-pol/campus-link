import { IsBoolean } from 'class-validator';

export class VoteReviewDto {
  @IsBoolean()
  is_helpful!: boolean;
}
