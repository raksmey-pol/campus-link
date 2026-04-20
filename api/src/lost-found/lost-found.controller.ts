import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ok } from '../common/http/api-response.util';
import { StorageService } from '../common/storage/storage.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';
import { ItemSubmissionRateLimitGuard } from './guards/item-submission-rate-limit.guard';
import { CreateItemDto } from './dto/create-item.dto';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ListItemsDto } from './dto/list-items.dto';
import { UpdateClaimStatusDto } from './dto/update-claim-status.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { LostFoundService } from './lost-found.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

@Controller('items')
export class LostFoundController {
  constructor(
    private readonly itemsService: LostFoundService,
    private readonly storageService: StorageService,
  ) {}

  // =========================== GET /items =====================================
  //  Public list with optional filters
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async listItems(
    @Query() query: ListItemsDto,
    @CurrentUser() user: User | null,
  ) {
    const result = await this.itemsService.listItems(query, user ?? null);
    return ok(result.data, {
      message: 'Items retrieved successfully',
      meta: result.meta as Record<string, unknown>,
    });
  }

  // =========================== GET /items/:id ==================================
  //  Authenticated detail view
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getItem(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    const item = await this.itemsService.getItemById(id, user);
    return ok(item, { message: 'Item detail retrieved successfully' });
  }

  // =========================== POST /items ====================================
  //  Submit a found-item report (multipart: photo + fields).
  //  Guests may submit; points are only awarded to registered users.
  @UseGuards(OptionalJwtAuthGuard, ItemSubmissionRateLimitGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_BYTES },
      fileFilter(_req, file, cb) {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only JPEG, PNG, JPG, and WebP images are accepted',
            ),
            false,
          );
        }
      },
    }),
  )
  async createItem(
    @Body() dto: CreateItemDto,
    @UploadedFile() photo: Express.Multer.File,
    @CurrentUser() user: User | undefined,
  ) {
    if (!photo) {
      throw new BadRequestException('A photo is required');
    }

    const uploadResult = await this.storageService.upload(photo, {
      folder: 'items',
      filename: `item-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    });

    const photoPath = uploadResult.url;
    const item = await this.itemsService.createItem(
      dto,
      photoPath,
      user ?? null,
    );
    return ok(item, { message: 'Found item report submitted successfully' });
  }

  // =========================== GET /items/:id/claims ==================================
  //  Moderator/Admin: list all claims for an item with claimer details.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Get(':id/claims')
  async listItemClaims(@Param('id', ParseIntPipe) id: number) {
    const claims = await this.itemsService.listItemClaims(id);
    return ok(claims, { message: 'Claims retrieved successfully' });
  }

  // =========================== POST /items/:id/claims ====================================
  //  Submit claim form for an approved item (authenticated users only).
  @UseGuards(JwtAuthGuard)
  @Post(':id/claims')
  async submitClaim(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateClaimDto,
    @CurrentUser() user: User,
  ) {
    const claim = await this.itemsService.submitClaim(id, dto, user);

    return ok(claim, { message: 'Claim submitted successfully' });
  }

  // =========================== PATCH /items/:id/claims/:claimId/status =====================
  //  Moderator/Admin or authenticated finder: approve or reject a claim.
  //  Approving a claim marks the item as CLAIMED and starts handoff confirmation flow.
  @UseGuards(JwtAuthGuard)
  @Patch(':id/claims/:claimId/status')
  async updateClaimStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('claimId', ParseIntPipe) claimId: number,
    @Body() dto: UpdateClaimStatusDto,
    @CurrentUser() actor: User,
  ) {
    const claim = await this.itemsService.updateClaimStatus(
      id,
      claimId,
      dto,
      actor,
    );

    return ok(claim, {
      message: `Claim ${dto.status.toLowerCase()} successfully`,
    });
  }

  // =========================== PATCH /items/:id/status ====================================
  //  Moderator or Admin: approve or reject a pending item.
  //  Approval triggers a Telegram broadcast.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemStatusDto,
    @CurrentUser() moderator: User,
  ) {
    const item = await this.itemsService.updateItemStatus(id, dto, moderator);
    return ok(item, {
      message: `Item ${dto.status.toLowerCase()} successfully`,
    });
  }

  // =========================== PATCH /items/:id/resolve ====================================
  //  Finder and approved claimer can confirm handoff; once both confirm,
  //  the item is resolved and points are awarded.
  //  Moderator/Admin can also force-resolve when needed.
  @UseGuards(JwtAuthGuard)
  @Patch(':id/resolve')
  async confirmResolve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    const result = await this.itemsService.confirmResolve(id, user);
    return ok({ resolved: result.resolved }, { message: result.message });
  }

  // =========================== DELETE /items/:id ====================================
  //  Admin only — permanently removes the item record.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteItem(@Param('id', ParseIntPipe) id: number) {
    await this.itemsService.deleteItem(id);
    return ok({ id }, { message: 'Item deleted successfully' });
  }
}
