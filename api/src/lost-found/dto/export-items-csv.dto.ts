import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { ItemStatus } from '../../database/enums';

export class ExportItemsCsvDto {
  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  high_value_only?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  claim_requests_only?: boolean = false;

  @IsOptional()
  @IsIn(['created_at', 'updated_at', 'value_tier'])
  sort?: 'created_at' | 'updated_at' | 'value_tier' = 'created_at';
}
