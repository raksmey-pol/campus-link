import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty!: number;

  @IsInt()
  @Min(0)
  @Max(20)
  workload_hours!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  quality!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  usefulness!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  recommendation!: number;

  @IsOptional()
  @IsString()
  review_text?: string;

  @IsOptional()
  is_anonymous?: boolean;
}
