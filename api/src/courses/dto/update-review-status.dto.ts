import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReviewStatus } from '../../database/enums';

export class UpdateReviewStatusDto {
  @IsEnum(ReviewStatus)
  status!: ReviewStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
