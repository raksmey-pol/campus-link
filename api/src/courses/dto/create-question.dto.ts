import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  title!: string;

  @IsString()
  @MinLength(10)
  body!: string;
}
