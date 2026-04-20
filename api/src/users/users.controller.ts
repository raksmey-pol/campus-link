import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ok } from '../common/http/api-response.util';
import { PointType } from '../database/enums';
import { User } from '../database/entities/user.entity';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me/points')
  async getMyPointHistory(
    @CurrentUser() user: User,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('type') typeRaw?: string,
  ) {
    const parsedPage = Number(pageRaw);
    const parsedLimit = Number(limitRaw);
    const page = Number.isFinite(parsedPage) ? parsedPage : 1;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 20;
    const normalizedType =
      typeRaw && (Object.values(PointType) as string[]).includes(typeRaw)
        ? (typeRaw as PointType)
        : undefined;

    const pointHistory = await this.usersService.getPointHistoryForUser(
      user.id,
      {
        page,
        limit,
        type: normalizedType,
      },
    );

    return ok(pointHistory, {
      message: 'Point history retrieved successfully',
    });
  }
}
