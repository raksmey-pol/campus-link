import { ResourceStatus } from '../../database/enums';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateResourceStatusDto {
  @IsEnum(ResourceStatus)
  status!: ResourceStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
