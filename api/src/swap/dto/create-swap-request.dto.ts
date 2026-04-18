import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { SwapType } from '../../database/enums';

export class CreateSwapRequestDto {
  @IsEnum(SwapType)
  swap_type!: SwapType;

  @IsInt()
  @Min(1)
  current_course_id!: number;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  current_section?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  desired_course_id?: number;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  desired_section?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}
