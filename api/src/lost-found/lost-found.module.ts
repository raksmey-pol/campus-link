import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Claim } from '../database/entities/claim.entity';
import { Item } from '../database/entities/item.entity';
import { PointTransaction } from '../database/entities/point-transaction.entity';
import { User } from '../database/entities/user.entity';
import { LostFoundController } from './lost-found.controller';
import { LostFoundService } from './lost-found.service';
import { ItemSubmissionRateLimitGuard } from './guards/item-submission-rate-limit.guard';
import { SubmissionRateLimitService } from './security/submission-rate-limit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Item, Claim, PointTransaction, User]),
    AuthModule, // re-exports RolesGuard and JwtStrategy
  ],
  controllers: [LostFoundController],
  providers: [
    LostFoundService,
    SubmissionRateLimitService,
    ItemSubmissionRateLimitGuard,
  ],
})
export class LostFoundModule {}
