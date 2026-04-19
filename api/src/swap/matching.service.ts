import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SwapRequest } from '../database/entities/swap-request.entity';
import { SwapMatch } from '../database/entities/swap-match.entity';
import {
  MatchStatus,
  MatchType,
  SwapStatus,
  SwapType,
} from '../database/enums';
import { SwapGateway } from './swap.gateway';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(SwapRequest)
    private readonly swapRequestRepo: Repository<SwapRequest>,
    @InjectRepository(SwapMatch)
    private readonly swapMatchRepo: Repository<SwapMatch>,
    private readonly swapGateway: SwapGateway,
  ) {}

  async runMatching(newRequest: SwapRequest): Promise<void> {
    // Load full relations needed for matching
    const request = await this.swapRequestRepo.findOne({
      where: { id: newRequest.id },
      relations: {
        requester: true,
        current_course: true,
        desired_course: true,
      },
    });
    if (!request) return;

    // Try direct match first
    const directMatch = await this.findDirectMatch(request);
    if (directMatch) {
      await this.createMatch(request, directMatch, null, MatchType.DIRECT);
      return;
    }

    // Try chain match (3-way cycle)
    const chain = await this.findChainMatch(request);
    if (chain) {
      await this.createMatch(chain[0], chain[1], chain[2], MatchType.CHAIN);
    }
  }

  // ─── Direct Match ─────────────────────────────────────────────────────────
  // A has X wants Y  <-->  B has Y wants X, sections compatible

  private async findDirectMatch(req: SwapRequest): Promise<SwapRequest | null> {
    const qb = this.swapRequestRepo
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.requester', 'requester')
      .leftJoinAndSelect('sr.current_course', 'current_course')
      .leftJoinAndSelect('sr.desired_course', 'desired_course')
      .where('sr.status = :open', { open: SwapStatus.OPEN })
      .andWhere('sr.id <> :id', { id: req.id })
      .andWhere('sr.requester_id <> :uid', { uid: req.requester.id })
      // Other's current = my desired
      .andWhere('sr.current_course_id = :myDesired', {
        myDesired: req.desired_course!.id,
      })
      // Other's desired = my current
      .andWhere('sr.desired_course_id = :myCurrent', {
        myCurrent: req.current_course.id,
      })
      .andWhere('sr.swap_type = :type', { type: req.swap_type });

    // Section compatibility for SECTION swaps
    if (req.swap_type === SwapType.SECTION) {
      // My desired section matches their current (or they accept any)
      if (req.desired_section) {
        qb.andWhere(
          '(sr.current_section = :myDesiredSection OR sr.current_section IS NULL)',
          { myDesiredSection: req.desired_section },
        );
      }
      // Their desired section matches my current (or they accept any)
      if (req.current_section) {
        qb.andWhere(
          '(sr.desired_section = :myCurrentSection OR sr.desired_section IS NULL)',
          { myCurrentSection: req.current_section },
        );
      }
    }

    return qb.getOne();
  }

  // ─── Chain Match (3-way cycle) ────────────────────────────────────────────
  // A wants what B has, B wants what C has, C wants what A has

  private async findChainMatch(
    reqA: SwapRequest,
  ): Promise<[SwapRequest, SwapRequest, SwapRequest] | null> {
    // Load all open requests except reqA
    const openRequests = await this.swapRequestRepo.find({
      where: { status: SwapStatus.OPEN },
      relations: {
        requester: true,
        current_course: true,
        desired_course: true,
      },
    });

    const others = openRequests.filter(
      (r) => r.id !== reqA.id && r.requester.id !== reqA.requester.id,
    );

    // Build adjacency: request X "connects to" Y if X.desired_course = Y.current_course
    // and section compatible
    for (const reqB of others) {
      // A → B: A wants what B has
      if (!this.canFulfill(reqA, reqB)) continue;

      for (const reqC of others) {
        if (reqC.id === reqB.id) continue;
        if (reqC.requester.id === reqB.requester.id) continue;

        // B → C: B wants what C has
        if (!this.canFulfill(reqB, reqC)) continue;

        // C → A: C wants what A has (closes the cycle)
        if (!this.canFulfill(reqC, reqA)) continue;

        return [reqA, reqB, reqC];
      }
    }

    return null;
  }

  /**
   * Returns true if `provider` has what `seeker` wants.
   * i.e. seeker.desired_course = provider.current_course AND sections compatible
   */
  private canFulfill(seeker: SwapRequest, provider: SwapRequest): boolean {
    if (!seeker.desired_course || !provider.current_course) return false;
    if (seeker.desired_course.id !== provider.current_course.id) return false;

    if (seeker.swap_type === SwapType.SECTION) {
      if (seeker.desired_section && provider.current_section) {
        if (seeker.desired_section !== provider.current_section) return false;
      }
    }

    return true;
  }

  // ─── Create Match Record ──────────────────────────────────────────────────

  private async createMatch(
    reqA: SwapRequest,
    reqB: SwapRequest,
    reqC: SwapRequest | null,
    type: MatchType,
  ): Promise<SwapMatch> {
    // Mark requests as MATCHED
    const toUpdate = [reqA, reqB];
    if (reqC) toUpdate.push(reqC);

    for (const req of toUpdate) {
      req.status = SwapStatus.MATCHED;
      await this.swapRequestRepo.save(req);
    }

    const match = this.swapMatchRepo.create({
      requestA: reqA,
      requestB: reqB,
      requestC: reqC ?? null,
      match_type: type,
      status: MatchStatus.PROPOSED,
    });

    const saved = await this.swapMatchRepo.save(match);

    // Emit WebSocket events to all participants
    const participants = [reqA.requester, reqB.requester];
    if (reqC) participants.push(reqC.requester);

    for (const user of participants) {
      this.swapGateway.emitToUser(user.id, 'swap:matched', {
        match_id: saved.id,
        match_type: type,
      });
    }

    return saved;
  }
}
