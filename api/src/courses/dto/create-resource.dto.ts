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

  // File upload handled separately via multer middleware
  // file?: Express.Multer.File;
}
