import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SwapStatus, SwapType } from '../../database/enums';

export class ListSwapsDto {
  @IsOptional()
  @IsEnum(SwapType)
  type?: SwapType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  course_id?: number;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsEnum(SwapStatus)
  status?: SwapStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
