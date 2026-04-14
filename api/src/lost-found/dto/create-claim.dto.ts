import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateClaimDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  proof_description!: string;
}
