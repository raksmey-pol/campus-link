import { ResourceType } from '../../database/enums';
import { IsEnum, IsString, IsOptional, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateResourceDto {
  @IsEnum(ResourceType)
  type!: ResourceType;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  link_url?: string;

  @IsOptional()
  @IsUrl()
  file_url?: string;
}
