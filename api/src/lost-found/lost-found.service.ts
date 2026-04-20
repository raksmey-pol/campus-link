import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Claim } from '../database/entities/claim.entity';
import { Item } from '../database/entities/item.entity';
import { PointTransaction } from '../database/entities/point-transaction.entity';
import { User } from '../database/entities/user.entity';
import {
  ClaimStatus,
  ItemStatus,
  PointType,
  UserRole,
  ValueTier,
} from '../database/enums';
import { CreateItemDto } from './dto/create-item.dto';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ExportItemsCsvDto } from './dto/export-items-csv.dto';
import { ListItemsDto } from './dto/list-items.dto';
import { UpdateClaimStatusDto } from './dto/update-claim-status.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { TelegramAnnouncementService } from './notifications/telegram-announcement.service';

/** Owner (claimer) trust points after successful handoff */
const OWNER_TRUST_POINTS = 5;

@Injectable()
export class LostFoundService {
  private readonly logger = new Logger(LostFoundService.name);

  constructor(
    @InjectRepository(Item)
    private readonly itemsRepo: Repository<Item>,
    @InjectRepository(Claim)
    private readonly claimsRepo: Repository<Claim>,
    @InjectRepository(PointTransaction)
    private readonly pointTxRepo: Repository<PointTransaction>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly telegramAnnouncementService: TelegramAnnouncementService,
  ) {}

  // ==================================== Public listing =====================================

  async listItems(query: ListItemsDto, requestingUser: User | null) {
    const {
      status,
      value_tier,
      location,
      sort = 'created_at',
      page = 1,
      limit = 20,
    } = query;

    const qb = this.itemsRepo
      .createQueryBuilder('item')
      .leftJoin('item.reporter', 'reporter')
      .select([
        'item.id',
        'item.title',
        'item.description',
        'item.photo_url',
        'item.value_tier',
        'item.status',
        'item.created_at',
        'reporter.id',
        'reporter.display_name',
        'reporter.avatar_url',
      ]);

    const canViewNonApproved =
      requestingUser?.role === UserRole.ADMIN ||
      requestingUser?.role === UserRole.MODERATOR;

    if (!canViewNonApproved) {
      qb.andWhere('item.status = :visibleStatus', {
        visibleStatus: ItemStatus.APPROVED,
      });
    } else if (status) {
      qb.andWhere('item.status = :status', { status });
    }
    if (value_tier) {
      qb.andWhere('item.value_tier = :value_tier', { value_tier });
    }
    if (location) {
      qb.andWhere('item.location ILIKE :location', {
        location: `%${location}%`,
      });
    }

    qb.orderBy(`item.${sort}`, 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    const claimSummaryByItemId = await this.getClaimSummariesByItemIds(
      items.map((item) => item.id),
    );

    const enrichedItems = items.map((item) => {
      const claimSummary = claimSummaryByItemId.get(item.id) ?? {
        total_claims: 0,
        pending_claims: 0,
        approved_claims: 0,
        rejected_claims: 0,
        latest_claim_submitted_at: null,
      };

      return {
        ...item,
        claim_summary: claimSummary,
        resolve_state: {
          is_resolved:
            item.status === ItemStatus.RESOLVED || item.resolved_at != null,
          finder_confirmed: item.finder_confirmed,
          claimer_confirmed: item.claimer_confirmed,
          resolved_at: item.resolved_at,
        },
      };
    });

    return {
      data: enrichedItems,
      meta: {
        page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async exportItemsCsv(query: ExportItemsCsvDto, requestingUser: User) {
    const {
      status,
      search,
      high_value_only = false,
      claim_requests_only = false,
      sort = 'created_at',
    } = query;

    const qb = this.itemsRepo
      .createQueryBuilder('item')
      .leftJoin('item.reporter', 'reporter')
      .select([
        'item.id',
        'item.title',
        'item.value_tier',
        'item.status',
        'item.location',
        'item.created_at',
        'reporter.id',
        'reporter.display_name',
      ]);

    const canViewNonApproved =
      requestingUser.role === UserRole.ADMIN ||
      requestingUser.role === UserRole.MODERATOR;

    if (!canViewNonApproved) {
      qb.andWhere('item.status = :visibleStatus', {
        visibleStatus: ItemStatus.APPROVED,
      });
    } else if (status) {
      qb.andWhere('item.status = :status', { status });
    }

    if (high_value_only) {
      qb.andWhere('item.value_tier IN (:...highValueTiers)', {
        highValueTiers: [ValueTier.HIGH, ValueTier.VERY_HIGH],
      });
    }

    const normalizedSearch = search?.trim();
    if (normalizedSearch) {
      qb.andWhere(
        '(CAST(item.id AS TEXT) ILIKE :search OR item.title ILIKE :search OR reporter.display_name ILIKE :search)',
        { search: `%${normalizedSearch}%` },
      );
    }

    qb.orderBy(`item.${sort}`, 'DESC');

    const items = await qb.getMany();
    const claimSummaryByItemId = await this.getClaimSummariesByItemIds(
      items.map((item) => item.id),
    );

    const exportItems = claim_requests_only
      ? items.filter(
          (item) =>
            (claimSummaryByItemId.get(item.id)?.pending_claims ?? 0) > 0,
        )
      : items;

    const headers = [
      'Case ID',
      'Item',
      'Status',
      'Value Tier',
      'Priority',
      'Location',
      'Reporter',
      'Submitted At',
      'Total Claims',
      'Pending Claims',
      'Approved Claims',
      'Rejected Claims',
    ];

    const rows = exportItems.map((item) => {
      const claimSummary = claimSummaryByItemId.get(item.id);
      const isHighPriority =
        item.value_tier === ValueTier.HIGH ||
        item.value_tier === ValueTier.VERY_HIGH;

      return [
        item.id,
        item.title,
        this.toModerationStatusLabel(item.status),
        item.value_tier.replaceAll('_', ' '),
        isHighPriority ? 'High Priority' : 'Normal Priority',
        item.location,
        item.reporter?.display_name ?? 'Campus Community',
        this.formatDateForCsv(item.created_at),
        claimSummary?.total_claims ?? 0,
        claimSummary?.pending_claims ?? 0,
        claimSummary?.approved_claims ?? 0,
        claimSummary?.rejected_claims ?? 0,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => this.escapeCsvCell(value)).join(','))
      .join('\r\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `lost-found-export-${timestamp}.csv`;

    return { csv, filename };
  }

  // ==================================== Public item detail (location masked for guests) =====================================

  async getItemById(id: number, requestingUser: User | null) {
    const item = await this.itemsRepo.findOne({
      where: { id },
      relations: { reporter: true, moderator: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const claimSummaryByItemId = await this.getClaimSummariesByItemIds([
      item.id,
    ]);
    const claimSummary = claimSummaryByItemId.get(item.id) ?? {
      total_claims: 0,
      pending_claims: 0,
      approved_claims: 0,
      rejected_claims: 0,
      latest_claim_submitted_at: null,
    };

    const itemWithClaimAndResolveInfo = {
      ...item,
      claim_summary: claimSummary,
      resolve_state: {
        is_resolved:
          item.status === ItemStatus.RESOLVED || item.resolved_at != null,
        finder_confirmed: item.finder_confirmed,
        claimer_confirmed: item.claimer_confirmed,
        resolved_at: item.resolved_at,
      },
    };

    // Unauthenticated callers only see an approximate location
    if (!requestingUser) {
      return {
        ...itemWithClaimAndResolveInfo,
        location: this.maskLocation(item.location),
      };
    }

    return itemWithClaimAndResolveInfo;
  }

  // ==================================== Submit found item =====================================

  async createItem(
    dto: CreateItemDto,
    photoPath: string,
    submitter: User | null,
  ) {
    const item = this.itemsRepo.create({
      title: dto.title,
      description: dto.description,
      photo_url: photoPath,
      value_tier: dto.value_tier,
      location: dto.location,
      status: ItemStatus.PENDING,
      reporter: submitter, // null for guest submissions
      telegram_message_id: null,
      moderator: null,
      resolved_at: null,
      finder_confirmed: false,
      claimer_confirmed: false,
    });

    return this.itemsRepo.save(item);
  }

  async submitClaim(itemId: number, dto: CreateClaimDto, claimer: User) {
    const item = await this.itemsRepo.findOne({
      where: { id: itemId },
      relations: { reporter: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.status !== ItemStatus.APPROVED) {
      throw new BadRequestException(
        'Claims can only be submitted for APPROVED items',
      );
    }

    if (item.reporter?.id === claimer.id) {
      throw new ForbiddenException('You cannot claim your own item');
    }

    const existingUserClaim = await this.claimsRepo.findOne({
      where: {
        item: { id: itemId },
        claimer: { id: claimer.id },
        status: ClaimStatus.PENDING,
      },
    });

    if (existingUserClaim) {
      throw new BadRequestException(
        'You already have a pending claim for this item',
      );
    }

    const claim = this.claimsRepo.create({
      item,
      claimer,
      proof_description: dto.proof_description,
      status: ClaimStatus.PENDING,
      moderator: null,
      rejection_reason: null,
      reviewed_at: null,
    });

    const savedClaim = await this.claimsRepo.save(claim);

    return {
      id: savedClaim.id,
      item: {
        id: item.id,
        title: item.title,
        status: item.status,
      },
      claimer: {
        id: claimer.id,
        display_name: claimer.display_name,
        avatar_url: claimer.avatar_url,
      },
      proof_description: savedClaim.proof_description,
      status: savedClaim.status,
      reviewed_at: savedClaim.reviewed_at,
      created_at: savedClaim.created_at,
    };
  }

  async updateClaimStatus(
    itemId: number,
    claimId: number,
    dto: UpdateClaimStatusDto,
    actor: User,
  ) {
    const claim = await this.claimsRepo.findOne({
      where: { id: claimId, item: { id: itemId } },
      relations: { item: { reporter: true }, claimer: true },
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    const isModeratorOrAdmin =
      actor.role === UserRole.MODERATOR || actor.role === UserRole.ADMIN;
    const isFinder = claim.item.reporter?.id === actor.id;

    if (!isModeratorOrAdmin && !isFinder) {
      throw new ForbiddenException(
        'Only the finder, moderator, or admin can review this claim',
      );
    }

    if (claim.status !== ClaimStatus.PENDING) {
      throw new BadRequestException('Only PENDING claims can be reviewed');
    }

    if (
      dto.status === ClaimStatus.REJECTED &&
      (!dto.rejection_reason || dto.rejection_reason.trim().length === 0)
    ) {
      throw new BadRequestException(
        'rejection_reason is required when status is REJECTED',
      );
    }

    if (dto.status === ClaimStatus.APPROVED) {
      if (claim.item.status !== ItemStatus.APPROVED) {
        throw new BadRequestException(
          'Claim can only be approved when item is in APPROVED status',
        );
      }

      await this.dataSource.transaction(async (manager) => {
        claim.status = ClaimStatus.APPROVED;
        claim.moderator = actor;
        claim.reviewed_at = new Date();
        claim.rejection_reason = null;
        await manager.save(Claim, claim);

        claim.item.status = ItemStatus.CLAIMED;
        claim.item.finder_confirmed = false;
        claim.item.claimer_confirmed = false;
        claim.item.resolved_at = null;
        claim.item.moderator = actor;
        await manager.save(Item, claim.item);

        await manager
          .createQueryBuilder()
          .update(Claim)
          .set({
            status: ClaimStatus.REJECTED,
            moderator: actor,
            reviewed_at: new Date(),
            rejection_reason: 'Another claim was approved for this item',
          })
          .where('item_id = :itemId', { itemId })
          .andWhere('id <> :claimId', { claimId })
          .andWhere('status = :pending', { pending: ClaimStatus.PENDING })
          .execute();
      });
    } else {
      claim.status = ClaimStatus.REJECTED;
      claim.moderator = actor;
      claim.reviewed_at = new Date();
      claim.rejection_reason = dto.rejection_reason?.trim() ?? null;
      await this.claimsRepo.save(claim);
    }

    if (dto.status === ClaimStatus.APPROVED) {
      // Fire-and-forget Telegram announcement — failure must not affect claim moderation
      void this.announceClaimerFoundToTelegram(claim.item, claim);
    }

    return {
      id: claim.id,
      item: {
        id: claim.item.id,
        status:
          dto.status === ClaimStatus.APPROVED
            ? ItemStatus.CLAIMED
            : claim.item.status,
      },
      claimer: {
        id: claim.claimer.id,
        display_name: claim.claimer.display_name,
        avatar_url: claim.claimer.avatar_url,
      },
      status: dto.status,
      rejection_reason:
        dto.status === ClaimStatus.REJECTED
          ? (dto.rejection_reason?.trim() ?? null)
          : null,
    };
  }

  // ==================================== Mod/Admin: approve or reject =====================================

  async updateItemStatus(
    id: number,
    dto: UpdateItemStatusDto,
    moderator: User,
  ) {
    const item = await this.itemsRepo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.status !== ItemStatus.PENDING) {
      throw new BadRequestException(
        'Only PENDING items can be approved or rejected',
      );
    }

    if (
      dto.status === ItemStatus.REJECTED &&
      (!dto.rejection_reason || dto.rejection_reason.trim().length === 0)
    ) {
      throw new BadRequestException(
        'rejection_reason is required when status is REJECTED',
      );
    }

    item.status = dto.status;
    item.moderator = moderator;

    const saved = await this.itemsRepo.save(item);

    if (dto.status === ItemStatus.APPROVED) {
      // Fire-and-forget Telegram broadcast — failure must not affect the response
      void this.announceApprovedItemToTelegram(saved);
    }

    return saved;
  }

  // =========================== Both-party resolve confirmation ================================

  /**
   * Either the reporter (finder) or the approved claimer calls this endpoint
   * to confirm the physical handoff. Once both have confirmed, the item
   * transitions to RESOLVED and point transactions are committed atomically.
   */
  async confirmResolve(id: number, user: User) {
    const item = await this.itemsRepo.findOne({
      where: { id },
      relations: { reporter: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.status === ItemStatus.RESOLVED) {
      return { resolved: true, message: 'Item is already resolved.' };
    }

    if (item.status !== ItemStatus.CLAIMED) {
      throw new BadRequestException(
        'Item must be in CLAIMED status before confirming resolve',
      );
    }

    // Identify the approved claim to know who the claimer is
    const approvedClaim = await this.claimsRepo.findOne({
      where: { item: { id }, status: ClaimStatus.APPROVED },
      relations: { claimer: true },
    });

    if (!approvedClaim) {
      throw new BadRequestException('No approved claim found for this item');
    }

    const isModeratorOrAdmin =
      user.role === UserRole.MODERATOR || user.role === UserRole.ADMIN;
    const isReporter = item.reporter?.id === user.id;
    const isClaimer = approvedClaim.claimer.id === user.id;

    if (isModeratorOrAdmin) {
      item.finder_confirmed = true;
      item.claimer_confirmed = true;

      await this.finalizeItemResolution(item, approvedClaim);
      return {
        resolved: true,
        message: 'Item resolved by moderator/admin override. Points awarded.',
      };
    }

    if (!isReporter && !isClaimer) {
      throw new ForbiddenException(
        'Only the finder, approved claimer, moderator, or admin can resolve this item',
      );
    }

    if (isReporter && item.finder_confirmed) {
      throw new BadRequestException('You have already confirmed the handoff');
    }
    if (isClaimer && item.claimer_confirmed) {
      throw new BadRequestException('You have already confirmed the handoff');
    }

    if (isReporter) item.finder_confirmed = true;
    if (isClaimer) item.claimer_confirmed = true;

    // Both parties have now confirmed — resolve atomically
    if (item.finder_confirmed && item.claimer_confirmed) {
      await this.finalizeItemResolution(item, approvedClaim);

      return { resolved: true, message: 'Item resolved. Points awarded.' };
    }

    // Save partial confirmation and report which side is still pending
    await this.itemsRepo.save(item);

    const pendingSide = isReporter ? 'claimer' : 'finder';
    return {
      resolved: false,
      message: `Confirmation recorded. Waiting for the ${pendingSide} to confirm.`,
    };
  }

  private async finalizeItemResolution(item: Item, approvedClaim: Claim) {
    await this.dataSource.transaction(async (manager) => {
      item.status = ItemStatus.RESOLVED;
      item.resolved_at = new Date();
      await manager.save(Item, item);

      // Award the finder (only registered reporters earn points)
      if (item.reporter) {
        const finderRewardPoints = this.getFinderRewardPointsByValueTier(
          item.value_tier,
        );

        const finderTx = manager.create(PointTransaction, {
          user: item.reporter,
          amount: finderRewardPoints,
          type: PointType.FINDER_REWARD,
          reference_id: item.id,
          reference_type: 'item',
        });
        await manager.save(PointTransaction, finderTx);
        await manager.increment(
          User,
          { id: item.reporter.id },
          'civic_points',
          finderRewardPoints,
        );
      }

      // Award the claimer
      const claimerTx = manager.create(PointTransaction, {
        user: approvedClaim.claimer,
        amount: OWNER_TRUST_POINTS,
        type: PointType.TRUST_CONFIRM,
        reference_id: item.id,
        reference_type: 'item',
      });
      await manager.save(PointTransaction, claimerTx);
      await manager.increment(
        User,
        { id: approvedClaim.claimer.id },
        'civic_points',
        OWNER_TRUST_POINTS,
      );
    });
  }

  // =========================== Mod/Admin: list claims for an item ================================

  async listItemClaims(itemId: number) {
    const item = await this.itemsRepo.findOne({ where: { id: itemId } });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const claims = await this.claimsRepo.find({
      where: { item: { id: itemId } },
      relations: { claimer: true },
      order: { created_at: 'DESC' },
    });

    return claims.map((claim) => ({
      id: claim.id,
      claimer: {
        id: claim.claimer.id,
        display_name: claim.claimer.display_name,
        avatar_url: claim.claimer.avatar_url,
      },
      proof_description: claim.proof_description,
      status: claim.status,
      rejection_reason: claim.rejection_reason,
      reviewed_at: claim.reviewed_at,
      created_at: claim.created_at,
    }));
  }

  // =========================== Admin: hard delete ================================

  async deleteItem(id: number) {
    const item = await this.itemsRepo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    await this.itemsRepo.remove(item);
  }

  // =========================== Private helpers ================================

  private async getClaimSummariesByItemIds(itemIds: number[]) {
    if (itemIds.length === 0) {
      return new Map<
        number,
        {
          total_claims: number;
          pending_claims: number;
          approved_claims: number;
          rejected_claims: number;
          latest_claim_submitted_at: string | null;
        }
      >();
    }

    const rows = await this.claimsRepo
      .createQueryBuilder('claim')
      .select('claim.item_id', 'item_id')
      .addSelect('COUNT(*)::int', 'total_claims')
      .addSelect(
        'COUNT(*) FILTER (WHERE claim.status = :pending)::int',
        'pending_claims',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE claim.status = :approved)::int',
        'approved_claims',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE claim.status = :rejected)::int',
        'rejected_claims',
      )
      .addSelect('MAX(claim.created_at)', 'latest_claim_submitted_at')
      .where('claim.item_id IN (:...itemIds)', { itemIds })
      .setParameters({
        pending: ClaimStatus.PENDING,
        approved: ClaimStatus.APPROVED,
        rejected: ClaimStatus.REJECTED,
      })
      .groupBy('claim.item_id')
      .getRawMany<{
        item_id: string;
        total_claims: string;
        pending_claims: string;
        approved_claims: string;
        rejected_claims: string;
        latest_claim_submitted_at: string | null;
      }>();

    const summaryMap = new Map<
      number,
      {
        total_claims: number;
        pending_claims: number;
        approved_claims: number;
        rejected_claims: number;
        latest_claim_submitted_at: string | null;
      }
    >();

    for (const row of rows) {
      summaryMap.set(Number(row.item_id), {
        total_claims: Number(row.total_claims ?? 0),
        pending_claims: Number(row.pending_claims ?? 0),
        approved_claims: Number(row.approved_claims ?? 0),
        rejected_claims: Number(row.rejected_claims ?? 0),
        latest_claim_submitted_at: row.latest_claim_submitted_at,
      });
    }

    return summaryMap;
  }

  /**
   * Shows only the broadest granularity of location to anonymous viewers
   * (e.g. building name). Specific floor/room info is hidden.
   */
  private maskLocation(location: string): string {
    const firstSegment = location.split(',')[0]?.trim();
    return firstSegment
      ? `${firstSegment}, [exact location hidden]`
      : '[location hidden]';
  }

  private getFinderRewardPointsByValueTier(valueTier: ValueTier): number {
    switch (valueTier) {
      case ValueTier.LOW:
        return 10;
      case ValueTier.MEDIUM:
        return 25;
      case ValueTier.HIGH:
        return 50;
      case ValueTier.VERY_HIGH:
        return 100;
      default:
        return 0;
    }
  }

  private toModerationStatusLabel(status: ItemStatus): string {
    switch (status) {
      case ItemStatus.PENDING:
        return 'Pending';
      case ItemStatus.APPROVED:
        return 'Approved';
      case ItemStatus.REJECTED:
        return 'Rejected';
      case ItemStatus.CLAIMED:
        return 'Claimed';
      case ItemStatus.RESOLVED:
        return 'Resolved';
      default:
        return 'Pending';
    }
  }

  private formatDateForCsv(value: Date | string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  private escapeCsvCell(value: unknown): string {
    const text = value == null ? '' : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  }

  private async announceApprovedItemToTelegram(item: Item): Promise<void> {
    if (item.telegram_message_id) {
      return;
    }

    try {
      const messageId =
        await this.telegramAnnouncementService.announceItemAdded(item);

      if (!messageId) {
        return;
      }

      await this.itemsRepo.update(item.id, { telegram_message_id: messageId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown announcement error';
      this.logger.warn(
        `Failed to announce approved item #${item.id} to Telegram: ${message}`,
      );
    }
  }

  private async announceClaimerFoundToTelegram(
    item: Item,
    claim: Claim,
  ): Promise<void> {
    try {
      await this.telegramAnnouncementService.announceClaimerFound(item, claim);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown announcement error';
      this.logger.warn(
        `Failed to announce claimer for item #${item.id} to Telegram: ${message}`,
      );
    }
  }
}
