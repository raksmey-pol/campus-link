import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ItemStatus, ValueTier } from '../../database/enums';

export class ListItemsDto {
  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @IsOptional()
  @IsEnum(ValueTier)
  value_tier?: ValueTier;

  /** Partial match against the location field (case-insensitive) */
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsIn(['created_at', 'updated_at', 'value_tier'])
  sort?: 'created_at' | 'updated_at' | 'value_tier' = 'created_at';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
