import { IsString, IsNumber, IsOptional, MinLength, MaxLength, Min } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  credits?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  prerequisites?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}
