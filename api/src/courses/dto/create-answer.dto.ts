import { IsString, MinLength } from 'class-validator';

export class CreateAnswerDto {
  @IsString()
  @MinLength(10)
  body!: string;
}
