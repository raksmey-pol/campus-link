import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SwapRequest } from '../database/entities/swap-request.entity';
import { SwapMatch } from '../database/entities/swap-match.entity';
import { SwapConfirmation } from '../database/entities/swap-confirmation.entity';
import { SwapAuditLog } from '../database/entities/swap-audit-log.entity';
import { PointTransaction } from '../database/entities/point-transaction.entity';
import { User } from '../database/entities/user.entity';
import { Course } from '../database/entities/course.entity';
import { Notification } from '../database/entities/notification.entity';
import {
  MatchStatus,
  NotificationModule,
  PointType,
  SwapStatus,
  SwapType,
} from '../database/enums';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { ListSwapsDto } from './dto/list-swaps.dto';
import { MatchingService } from './matching.service';
import { SwapGateway } from './swap.gateway';

const SWAP_COMPLETE_POINTS = 10;
const SWAP_EXPIRY_DAYS = 7;
const SWAP_COOLDOWN_HOURS = 24;

@Injectable()
export class SwapService {
  constructor(
    @InjectRepository(SwapRequest)
    private readonly swapRequestRepo: Repository<SwapRequest>,
    @InjectRepository(SwapMatch)
    private readonly swapMatchRepo: Repository<SwapMatch>,
    @InjectRepository(SwapConfirmation)
    private readonly swapConfirmationRepo: Repository<SwapConfirmation>,
    @InjectRepository(SwapAuditLog)
    private readonly auditLogRepo: Repository<SwapAuditLog>,
    @InjectRepository(PointTransaction)
    private readonly pointTxRepo: Repository<PointTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly dataSource: DataSource,
    private readonly matchingService: MatchingService,
    private readonly swapGateway: SwapGateway,
  ) {}

  // ─── Swap Requests ────────────────────────────────────────────────────────

  async listSwaps(query: ListSwapsDto) {
    const { type, course_id, section, status, page = 1, limit = 20 } = query;

    const qb = this.swapRequestRepo
      .createQueryBuilder('sr')
      .leftJoin('sr.requester', 'requester')
      .leftJoin('sr.current_course', 'current_course')
      .leftJoin('sr.desired_course', 'desired_course')
      .select([
        'sr.id',
        'sr.swap_type',
        'sr.current_section',
        'sr.desired_section',
        'sr.status',
        'sr.notes',
        'sr.expires_at',
        'sr.created_at',
        'requester.id',
        'requester.display_name',
        'requester.avatar_url',
        'current_course.id',
        'current_course.code',
        'current_course.title',
        'desired_course.id',
        'desired_course.code',
        'desired_course.title',
      ]);

    if (type) qb.where('sr.swap_type = :type', { type });
    if (course_id) qb.andWhere('sr.current_course_id = :course_id', { course_id });
    if (section) qb.andWhere('sr.current_section = :section', { section });
    if (status) qb.andWhere('sr.status = :status', { status });

    qb.orderBy('sr.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async listMySwaps(user: User) {
    return this.swapRequestRepo.find({
      where: { requester: { id: user.id } },
      relations: { current_course: true, desired_course: true },
      order: { created_at: 'DESC' },
    });
  }

  async getSwapById(id: number) {
    const swap = await this.swapRequestRepo.findOne({
      where: { id },
      relations: {
        requester: true,
        current_course: true,
        desired_course: true,
      },
    });
    if (!swap) throw new NotFoundException('Swap request not found');
    return swap;
  }

  async createSwap(
    dto: CreateSwapRequestDto,
    user: User,
  ): Promise<SwapRequest> {
    // 1. Load and validate courses
    const currentCourse = await this.courseRepo.findOne({
      where: { id: dto.current_course_id },
    });
    if (!currentCourse)
      throw new BadRequestException('Current course not found');

    let desiredCourse: Course | null = null;
    if (dto.swap_type === SwapType.COURSE) {
      if (!dto.desired_course_id) {
        throw new BadRequestException(
          'desired_course_id is required for COURSE swaps',
        );
      }
      desiredCourse = await this.courseRepo.findOne({
        where: { id: dto.desired_course_id },
      });
      if (!desiredCourse)
        throw new BadRequestException('Desired course not found');
    } else {
      // SECTION swap — desired course same as current
      desiredCourse = currentCourse;
    }

    // 2. One-active-per-course constraint (partial unique index backup check)
    const existing = await this.swapRequestRepo
      .createQueryBuilder('sr')
      .where('sr.requester_id = :uid', { uid: user.id })
      .andWhere('sr.current_course_id = :cid', { cid: dto.current_course_id })
      .andWhere('sr.status IN (:...statuses)', {
        statuses: [SwapStatus.OPEN, SwapStatus.MATCHED],
      })
      .getOne();

    if (existing) {
      throw new BadRequestException(
        'You already have an active swap request for this course',
      );
    }

    // 3. Cooldown check — last terminal request for same course
    const lastTerminal = await this.swapRequestRepo
      .createQueryBuilder('sr')
      .where('sr.requester_id = :uid', { uid: user.id })
      .andWhere('sr.current_course_id = :cid', { cid: dto.current_course_id })
      .andWhere('sr.status IN (:...statuses)', {
        statuses: [SwapStatus.COMPLETED, SwapStatus.CANCELLED],
      })
      .andWhere('sr.cooldown_until > NOW()')
      .getOne();

    if (lastTerminal) {
      throw new BadRequestException(
        `You must wait until ${lastTerminal.cooldown_until!.toISOString()} before creating another swap request for this course`,
      );
    }

    // 4. Create request
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SWAP_EXPIRY_DAYS);

    const swapRequest = this.swapRequestRepo.create({
      requester: user,
      swap_type: dto.swap_type,
      current_course: currentCourse,
      current_section: dto.current_section ?? null,
      desired_course: desiredCourse,
      desired_section: dto.desired_section ?? null,
      notes: dto.notes ?? null,
      status: SwapStatus.OPEN,
      expires_at: expiresAt,
      cooldown_until: null,
    });

    const saved = await this.swapRequestRepo.save(swapRequest);

    // 5. Trigger matching engine (non-blocking)
    this.matchingService.runMatching(saved).catch((err: unknown) => {
      console.error('Matching engine error:', err);
    });

    return saved;
  }

  async cancelSwap(id: number, user: User): Promise<SwapRequest> {
    const swap = await this.swapRequestRepo.findOne({
      where: { id },
      relations: { requester: true },
    });
    if (!swap) throw new NotFoundException('Swap request not found');
    if (swap.requester.id !== user.id) {
      throw new ForbiddenException(
        'You can only cancel your own swap requests',
      );
    }
    if (![SwapStatus.OPEN, SwapStatus.MATCHED].includes(swap.status)) {
      throw new BadRequestException(
        'Only OPEN or MATCHED requests can be cancelled',
      );
    }

    const prevStatus = swap.status;
    swap.status = SwapStatus.CANCELLED;
    swap.cooldown_until = this.buildCooldownDate();
    await this.swapRequestRepo.save(swap);

    await this.writeAuditLog(
      swap,
      user,
      prevStatus,
      SwapStatus.CANCELLED,
      null,
    );
    return swap;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async adminDeleteSwap(id: number, _admin: User): Promise<void> {
    const swap = await this.swapRequestRepo.findOne({ where: { id } });
    if (!swap) throw new NotFoundException('Swap request not found');
    await this.swapRequestRepo.remove(swap);
  }

  // ─── Matches ──────────────────────────────────────────────────────────────

  async listMyMatches(user: User) {
    const matches = await this.swapMatchRepo
      .createQueryBuilder('m')
      .leftJoin('m.requestA', 'ra')
      .leftJoin('m.requestB', 'rb')
      .leftJoin('m.requestC', 'rc')
      .leftJoin('ra.requester', 'userA')
      .leftJoin('rb.requester', 'userB')
      .leftJoin('rc.requester', 'userC')
      .leftJoin('ra.current_course', 'courseA')
      .leftJoin('rb.current_course', 'courseB')
      .leftJoin('rc.current_course', 'courseC')
      .leftJoin('ra.desired_course', 'desiredA')
      .leftJoin('rb.desired_course', 'desiredB')
      .leftJoin('rc.desired_course', 'desiredC')
      .select([
        'm.id',
        'm.match_type',
        'm.status',
        'm.created_at',
        'ra.id',
        'ra.current_section',
        'ra.desired_section',
        'ra.status',
        'rb.id',
        'rb.current_section',
        'rb.desired_section',
        'rb.status',
        'rc.id',
        'rc.current_section',
        'rc.desired_section',
        'rc.status',
        'userA.id',
        'userA.display_name',
        'userB.id',
        'userB.display_name',
        'userC.id',
        'userC.display_name',
        'courseA.id',
        'courseA.code',
        'courseA.title',
        'courseB.id',
        'courseB.code',
        'courseB.title',
        'courseB.title',
        'courseC.id',
        'courseC.code',
        'courseC.title',
        'desiredA.id',
        'desiredA.code',
        'desiredB.id',
        'desiredB.code',
        'desiredC.id',
        'desiredC.code',
      ])
      .where('userA.id = :uid OR userB.id = :uid OR userC.id = :uid', {
        uid: user.id,
      })
      .andWhere('m.status IN (:...statuses)', {
        statuses: [
          MatchStatus.PROPOSED,
          MatchStatus.ACCEPTED,
          MatchStatus.COMPLETED,
        ],
      })
      .getMany();

    if (!matches.length) return [];

    // Fetch confirmations for all matches in one query
    const matchIds = matches.map((m) => m.id);
    const confirmations = await this.swapConfirmationRepo
      .createQueryBuilder('c')
      .leftJoin('c.user', 'u')
      .leftJoin('c.match', 'm')
      .select(['c.id', 'c.confirmed_at', 'u.id', 'u.display_name', 'm.id'])
      .where('m.id IN (:...matchIds)', { matchIds })
      .getMany();

    // Group by match_id from raw result
    const confirmationsByMatchId = new Map<number, any[]>();
    for (const c of confirmations) {
      const mid = c.match.id;
      if (!confirmationsByMatchId.has(mid)) {
        confirmationsByMatchId.set(mid, []);
      }
      confirmationsByMatchId.get(mid)!.push({
        c_id: c.id,
        c_match_id: c.match.id,
        c_confirmed_at: c.confirmed_at,
        u_id: c.user.id,
        u_display_name: c.user.display_name,
      });
    }

    return matches.map((m) => ({
      ...m,
      confirmations: confirmationsByMatchId.get(m.id) ?? [],
    }));
  }

  async getMatchById(id: number, user: User) {
    const match = await this.swapMatchRepo.findOne({
      where: { id },
      relations: {
        requestA: {
          requester: true,
          current_course: true,
          desired_course: true,
        },
        requestB: {
          requester: true,
          current_course: true,
          desired_course: true,
        },
        requestC: {
          requester: true,
          current_course: true,
          desired_course: true,
        },
      },
    });
    if (!match) throw new NotFoundException('Match not found');

    const participants = this.getParticipants(match);
    if (!participants.find((p) => p.id === user.id)) {
      throw new ForbiddenException('You are not a participant in this match');
    }
    const confirmations = await this.swapConfirmationRepo.find({
      where: { match: { id } },
      relations: { user: true },
    });

    const shapedConfirmations = confirmations.map((c) => ({
      c_id: c.id,
      c_match_id: id,
      c_confirmed_at: c.confirmed_at,
      u_id: c.user.id,
      u_display_name: c.user.display_name,
    }));

    return { ...match, confirmations: shapedConfirmations };
  }

  async confirmMatch(matchId: number, user: User): Promise<void> {
    const match = await this.swapMatchRepo.findOne({
      where: { id: matchId },
      relations: {
        requestA: { requester: true },
        requestB: { requester: true },
        requestC: { requester: true },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (
      match.status !== MatchStatus.PROPOSED &&
      match.status !== MatchStatus.ACCEPTED
    ) {
      throw new BadRequestException('Match is no longer pending confirmation');
    }

    // Verify caller is a participant
    const participants = this.getParticipants(match);
    if (!participants.find((p) => p.id === user.id)) {
      throw new ForbiddenException('You are not a participant in this match');
    }

    // Idempotency — already confirmed
    const alreadyConfirmed = await this.swapConfirmationRepo.findOne({
      where: { match: { id: matchId }, user: { id: user.id } },
    });
    if (alreadyConfirmed)
      throw new BadRequestException('You have already confirmed this match');

    await this.dataSource.transaction(async (manager) => {
      // Save confirmation
      const confirmation = manager.create(SwapConfirmation, {
        match,
        user,
      });
      await manager.save(SwapConfirmation, confirmation);

      // Count total confirmations
      const confirmationCount = await manager.count(SwapConfirmation, {
        where: { match: { id: matchId } },
      });

      const requiredCount = participants.length;

      if (confirmationCount < requiredCount) {
        // Partial — update match to ACCEPTED, notify waiting party
        match.status = MatchStatus.ACCEPTED;
        await manager.save(SwapMatch, match);

        const waitingUsers = participants.filter((p) => p.id !== user.id);
        for (const waiting of waitingUsers) {
          await this.createNotification(
            manager,
            waiting,
            'swap:confirmed',
            'Swap Confirmation',
            `${user.display_name} has confirmed the swap. Your turn!`,
            match.id,
            'swap_match',
          );
          this.swapGateway.emitToUser(waiting.id, 'swap:confirmed', {
            match_id: match.id,
            confirmed_by: { id: user.id, display_name: user.display_name },
          });
        }
      } else {
        // All confirmed — complete
        match.status = MatchStatus.COMPLETED;
        await manager.save(SwapMatch, match);

        // Mark all swap requests as COMPLETED and set cooldown
        const requests = [match.requestA, match.requestB];
        if (match.requestC) requests.push(match.requestC);

        for (const req of requests) {
          req.status = SwapStatus.COMPLETED;
          req.cooldown_until = this.buildCooldownDate();
          await manager.save(SwapRequest, req);

          await this.writeAuditLog(
            req,
            user,
            SwapStatus.MATCHED,
            SwapStatus.COMPLETED,
            manager,
          );
        }

        // Award points to all participants
        for (const participant of participants) {
          const tx = manager.create(PointTransaction, {
            user: participant,
            amount: SWAP_COMPLETE_POINTS,
            type: PointType.SWAP_COMPLETE,
            reference_id: match.id,
            reference_type: 'swap_match',
          });
          await manager.save(PointTransaction, tx);
          await manager.increment(
            User,
            { id: participant.id },
            'civic_points',
            SWAP_COMPLETE_POINTS,
          );

          await this.createNotification(
            manager,
            participant,
            'swap:completed',
            'Swap Completed!',
            `Your swap has been completed. +${SWAP_COMPLETE_POINTS} Cooperation Points awarded.`,
            match.id,
            'swap_match',
          );
          this.swapGateway.emitToUser(participant.id, 'swap:completed', {
            match_id: match.id,
            points_awarded: SWAP_COMPLETE_POINTS,
          });
        }
      }
    });
  }

  async declineMatch(matchId: number, user: User): Promise<void> {
    const match = await this.swapMatchRepo.findOne({
      where: { id: matchId },
      relations: {
        requestA: { requester: true },
        requestB: { requester: true },
        requestC: { requester: true },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (
      match.status !== MatchStatus.PROPOSED &&
      match.status !== MatchStatus.ACCEPTED
    ) {
      throw new BadRequestException('Match cannot be declined at this stage');
    }

    const participants = this.getParticipants(match);
    if (!participants.find((p) => p.id === user.id)) {
      throw new ForbiddenException('You are not a participant in this match');
    }

    await this.dataSource.transaction(async (manager) => {
      match.status = MatchStatus.DECLINED;
      await manager.save(SwapMatch, match);

      // Reopen all requests
      const requests = [match.requestA, match.requestB];
      if (match.requestC) requests.push(match.requestC);

      for (const req of requests) {
        req.status = SwapStatus.OPEN;
        await manager.save(SwapRequest, req);
      }

      // Notify other participants
      const others = participants.filter((p) => p.id !== user.id);
      for (const other of others) {
        await this.createNotification(
          manager,
          other,
          'swap:declined',
          'Swap Match Declined',
          `${user.display_name} declined the swap. Your request is back to open.`,
          match.id,
          'swap_match',
        );
      }
    });
  }

  // ─── Cron: Expiry ─────────────────────────────────────────────────────────

  async expireStaleRequests(): Promise<void> {
    const stale = await this.swapRequestRepo
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.requester', 'requester')
      .leftJoinAndSelect('sr.current_course', 'current_course')
      .where('sr.status IN (:...statuses)', {
        statuses: [SwapStatus.OPEN, SwapStatus.MATCHED],
      })
      .andWhere('sr.expires_at <= NOW()')
      .getMany();

    if (!stale.length) return;

    for (const req of stale) {
      const prev = req.status;
      req.status = SwapStatus.EXPIRED;
      await this.swapRequestRepo.save(req);

      await this.writeAuditLog(
        req,
        req.requester,
        prev,
        SwapStatus.EXPIRED,
        null,
      );

      await this.notificationRepo.save(
        this.notificationRepo.create({
          user: req.requester,
          module: NotificationModule.SWAP,
          type: 'swap:expired',
          title: 'Swap Request Expired',
          body: `Your swap request for ${req.current_course?.code ?? 'a course'} has expired with no match found.`,
          reference_id: req.id,
          reference_type: 'swap_request',
        }),
      );

      this.swapGateway.emitToUser(req.requester.id, 'swap:expired', {
        swap_request_id: req.id,
      });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getParticipants(match: SwapMatch): User[] {
    const users = [match.requestA.requester, match.requestB.requester];
    if (match.requestC?.requester) users.push(match.requestC.requester);
    return users;
  }

  private buildCooldownDate(): Date {
    const d = new Date();
    d.setHours(d.getHours() + SWAP_COOLDOWN_HOURS);
    return d;
  }

  private async writeAuditLog(
    swap: SwapRequest,
    actor: User,
    from: SwapStatus,
    to: SwapStatus,
    manager: EntityManager | null,
  ): Promise<void> {
    const repo = manager ?? this.dataSource.manager;
    const log = repo.create(SwapAuditLog, {
      swapRequest: swap,
      actor,
      from_status: from,
      to_status: to,
      metadata: null,
    });
    await repo.save(SwapAuditLog, log);
  }

  private async createNotification(
    manager: EntityManager,
    user: User,
    type: string,
    title: string,
    body: string,
    referenceId: number,
    referenceType: string,
  ): Promise<void> {
    const n = manager.create(Notification, {
      user,
      module: NotificationModule.SWAP,
      type,
      title,
      body,
      reference_id: referenceId,
      reference_type: referenceType,
    });
    await manager.save(Notification, n);
  }
}
