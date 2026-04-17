import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';
import { SwapService } from './swap.service';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { ListSwapsDto } from './dto/list-swaps.dto';
import { ok } from '../common/http/response.helper';

@Controller('swaps')
export class SwapRequestsController {
  constructor(private readonly swapService: SwapService) {}

  @Get()
  async list(@Query() query: ListSwapsDto) {
    return ok(await this.swapService.listSwaps(query));
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async listMine(@CurrentUser() user: User) {
    return ok(await this.swapService.listMySwaps(user));
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return ok(await this.swapService.getSwapById(id));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateSwapRequestDto, @CurrentUser() user: User) {
    return ok(await this.swapService.createSwap(dto, user), {
      message: 'Swap request created',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return ok(await this.swapService.cancelSwap(id, user), {
      message: 'Swap request cancelled',
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async adminDelete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: User,
  ) {
    await this.swapService.adminDeleteSwap(id, admin);
    return ok(null, { message: 'Swap request deleted' });
  }
}
