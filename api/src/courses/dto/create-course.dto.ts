import { IsString, IsNumber, IsOptional, MinLength, MaxLength, Min } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsNumber()
  @Min(1)
  credits!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  department!: string;

  @IsOptional()
  @IsString()
  prerequisites?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
