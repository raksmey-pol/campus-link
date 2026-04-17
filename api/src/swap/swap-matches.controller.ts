import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { SwapService } from './swap.service';
import { ok } from '../common/http/response.helper';

@Controller('swaps/matches')
export class SwapMatchesController {
  constructor(private readonly swapService: SwapService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async listMyMatches(@CurrentUser() user: User) {
    return ok(await this.swapService.listMyMatches(user));
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getMatch(@Param('id', ParseIntPipe) id: number) {
    return ok(await this.swapService.getMatchById(id));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/confirm')
  async confirm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.swapService.confirmMatch(id, user);
    return ok(null, { message: 'Match confirmed' });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/decline')
  async decline(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.swapService.declineMatch(id, user);
    return ok(null, { message: 'Match declined' });
  }
}
