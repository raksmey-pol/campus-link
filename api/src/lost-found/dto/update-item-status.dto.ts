import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { ItemStatus } from '../../database/enums';

/** Only APPROVED and REJECTED are valid transitions from a moderator */
export class UpdateItemStatusDto {
  @IsEnum([ItemStatus.APPROVED, ItemStatus.REJECTED], {
    message: 'status must be APPROVED or REJECTED',
  })
  status!: ItemStatus.APPROVED | ItemStatus.REJECTED;

  /** Required when rejecting; explains why the item was not approved */
  @ValidateIf((dto: UpdateItemStatusDto) => dto.status === ItemStatus.REJECTED)
  @IsString()
  @IsNotEmpty({
    message: 'rejection_reason is required when status is REJECTED',
  })
  rejection_reason?: string;
}
