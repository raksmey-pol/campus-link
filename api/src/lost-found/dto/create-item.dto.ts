import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ValueTier } from '../../database/enums';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @IsEnum(ValueTier)
  value_tier!: ValueTier;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  location!: string;
}
