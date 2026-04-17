import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SwapRequest } from '../database/entities/swap-request.entity';
import { SwapMatch } from '../database/entities/swap-match.entity';
import { SwapConfirmation } from '../database/entities/swap-confirmation.entity';
import { SwapAuditLog } from '../database/entities/swap-audit-log.entity';
import { PointTransaction } from '../database/entities/point-transaction.entity';
import { User } from '../database/entities/user.entity';
import { Course } from '../database/entities/course.entity';
import { Notification } from '../database/entities/notification.entity';
import { SwapService } from './swap.service';
import { MatchingService } from './matching.service';
import { SwapGateway } from './swap.gateway';
import { SwapExpiryCron } from './swap-expiry.cron';
import { SwapRequestsController } from './swap-requests.controller';
import { SwapMatchesController } from './swap-matches.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SwapRequest,
      SwapMatch,
      SwapConfirmation,
      SwapAuditLog,
      PointTransaction,
      User,
      Course,
      Notification,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [SwapRequestsController, SwapMatchesController],
  providers: [SwapService, MatchingService, SwapGateway, SwapExpiryCron],
})
export class SwapModule {}
