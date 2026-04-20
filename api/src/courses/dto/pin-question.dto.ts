import { IsBoolean } from 'class-validator';

export class PinQuestionDto {
  @IsBoolean()
  is_pinned!: boolean;
}
