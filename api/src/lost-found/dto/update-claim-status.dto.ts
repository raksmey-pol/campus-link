import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { ClaimStatus } from '../../database/enums';

export class UpdateClaimStatusDto {
  @IsEnum([ClaimStatus.APPROVED, ClaimStatus.REJECTED], {
    message: 'status must be APPROVED or REJECTED',
  })
  status!: ClaimStatus.APPROVED | ClaimStatus.REJECTED;

  @ValidateIf(
    (dto: UpdateClaimStatusDto) => dto.status === ClaimStatus.REJECTED,
  )
  @IsString()
  @IsNotEmpty({
    message: 'rejection_reason is required when status is REJECTED',
  })
  rejection_reason?: string;
}
