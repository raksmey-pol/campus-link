import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CourseResource } from '../database/entities/course-resource.entity';
import { ResourceVote } from '../database/entities/resource-vote.entity';
import { PointTransaction } from '../database/entities/point-transaction.entity';
import { Course } from '../database/entities/course.entity';
import { User } from '../database/entities/user.entity';
import { ResourceStatus, ResourceType, PointType, VoteValue } from '../database/enums';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceStatusDto } from './dto/update-resource-status.dto';
import { VoteResourceDto } from './dto/vote-resource.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(CourseResource)
    private readonly resourceRepository: Repository<CourseResource>,
    @InjectRepository(ResourceVote)
    private readonly resourceVoteRepository: Repository<ResourceVote>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get approved resources for a course, optionally filtered by type
   */
  async getApprovedResourcesByCourse(
    courseId: number,
    type?: ResourceType,
    page: number = 1,
  ) {
    const take = 10;
    const skip = (page - 1) * take;

    const qb = this.resourceRepository
      .createQueryBuilder('resource')
      .where('resource.course_id = :courseId', { courseId })
      .andWhere('resource.status = :status', { status: ResourceStatus.APPROVED })
      .leftJoinAndSelect('resource.user', 'user')
      .orderBy('resource.upvotes', 'DESC')
      .addOrderBy('resource.created_at', 'DESC');

    if (type) {
      qb.andWhere('resource.type = :type', { type });
    }

    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((r) => this.sanitizeResource(r)),
      total,
      page,
    };
  }

  async listModerationResources(options: {
    status?: ResourceStatus;
    type?: ResourceType;
    page?: number;
    search?: string;
  }) {
    const take = 20;
    const page = Math.max(1, options.page ?? 1);
    const skip = (page - 1) * take;
    const search = options.search?.trim();

    const qb = this.resourceRepository
      .createQueryBuilder('resource')
      .leftJoinAndSelect('resource.user', 'user')
      .leftJoinAndSelect('resource.course', 'course');

    if (options.status) {
      qb.where('resource.status = :status', { status: options.status });
    }

    if (options.type) {
      qb.andWhere('resource.type = :type', { type: options.type });
    }

    if (search) {
      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where('course.code ILIKE :search', { search: `%${search}%` })
            .orWhere('course.title ILIKE :search', { search: `%${search}%` })
            .orWhere('user.display_name ILIKE :search', { search: `%${search}%` })
            .orWhere('resource.title ILIKE :search', { search: `%${search}%` })
            .orWhere('resource.description ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    if (!options.status) {
      qb.orderBy(
        `CASE
          WHEN resource.status = '${ResourceStatus.PENDING}' THEN 0
          WHEN resource.status = '${ResourceStatus.REJECTED}' THEN 1
          ELSE 2
        END`,
        'ASC',
      );
    }

    qb
      .addOrderBy('resource.created_at', 'DESC')
      .skip(skip)
      .take(take);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((resource) => ({
        id: resource.id,
        status: resource.status,
        type: resource.type,
        title: resource.title,
        description: resource.description,
        file_url: resource.file_url,
        link_url: resource.link_url,
        upvotes: resource.upvotes,
        downvotes: resource.downvotes,
        created_at: resource.created_at,
        user: {
          id: resource.user.id,
          display_name: resource.user.display_name,
        },
        course: {
          id: resource.course.id,
          code: resource.course.code,
          title: resource.course.title,
          department: resource.course.department,
        },
      })),
      total,
      page,
      pageSize: take,
    };
  }

  async getModerationCounts() {
    const [pending, approved, rejected, total] = await Promise.all([
      this.resourceRepository.count({ where: { status: ResourceStatus.PENDING } }),
      this.resourceRepository.count({ where: { status: ResourceStatus.APPROVED } }),
      this.resourceRepository.count({ where: { status: ResourceStatus.REJECTED } }),
      this.resourceRepository.count(),
    ]);

    return { pending, approved, rejected, total };
  }

  /**
   * Get a single resource by ID (for download endpoint)
   */
  async getResourceById(resourceId: number): Promise<CourseResource | null> {
    return this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['user'],
    });
  }

  /**
   * Create a new resource (enters moderation queue)
   */
  async uploadResource(
    courseId: number,
    userId: number,
    dto: CreateResourceDto,
    fileUrl?: string,
  ): Promise<CourseResource> {
    // Verify course exists
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }

    // Validate that required URLs are provided based on type
    if (dto.type === ResourceType.EXTERNAL_LINK && !dto.link_url) {
      throw new BadRequestException('External links must have a link_url');
    }

    if (
      [ResourceType.NOTES, ResourceType.PAST_ASSESSMENT, ResourceType.PROJECT_EXAMPLE].includes(
        dto.type,
      ) &&
      !fileUrl &&
      !dto.file_url
    ) {
      throw new BadRequestException(`${dto.type} resources require a file upload or file_url`);
    }

    const resource = this.resourceRepository.create({
      course: { id: courseId },
      user: { id: userId },
      type: dto.type,
      title: dto.title,
      description: dto.description || null,
      file_url: fileUrl || dto.file_url || null,
      link_url: dto.link_url || null,
      status: ResourceStatus.PENDING,
      upvotes: 0,
      downvotes: 0,
    });

    return this.resourceRepository.save(resource);
  }

  /**
   * Vote on a resource (upvote/downvote, with ability to change or remove vote)
   * Returns the updated resource with new vote counts
   */
  async voteResource(
    resourceId: number,
    userId: number,
    dto: VoteResourceDto,
  ): Promise<CourseResource> {
    // Verify resource exists
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['user'],
    });
    if (!resource) {
      throw new NotFoundException(`Resource with id ${resourceId} not found`);
    }

    // Check for existing vote
    const existingVote = await this.resourceVoteRepository.findOne({
      where: { resource: { id: resourceId }, user: { id: userId } },
    });

    // If user is voting the same way, remove the vote
    if (existingVote && existingVote.vote === dto.vote) {
      // Remove the vote
      await this.resourceVoteRepository.remove(existingVote);

      // Update resource vote counts
      await this.updateResourceVoteCounts(resourceId);

      const updatedResource = await this.resourceRepository.findOne({
        where: { id: resourceId },
        relations: ['user'],
      });

      return this.sanitizeResource(updatedResource!);
    }

    // If user has a different vote, update it
    if (existingVote) {
      existingVote.vote = dto.vote;
      await this.resourceVoteRepository.save(existingVote);

      // Update resource vote counts
      await this.updateResourceVoteCounts(resourceId);

      const updatedResource = await this.resourceRepository.findOne({
        where: { id: resourceId },
        relations: ['user'],
      });

      return this.sanitizeResource(updatedResource!);
    }

    // Create new vote
    const vote = this.resourceVoteRepository.create({
      resource: { id: resourceId },
      user: { id: userId },
      vote: dto.vote,
    });

    await this.resourceVoteRepository.save(vote);

    // Update resource vote counts
    await this.updateResourceVoteCounts(resourceId);

    const updatedResource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['user'],
    });

    return this.sanitizeResource(updatedResource!);
  }

  /**
   * Update resource vote counts
   */
  private async updateResourceVoteCounts(resourceId: number): Promise<void> {
    const votes = await this.resourceVoteRepository.find({
      where: { resource: { id: resourceId } },
    });

    const upvotes = votes.filter((v) => v.vote === VoteValue.UP).length;
    const downvotes = votes.filter((v) => v.vote === VoteValue.DOWN).length;

    await this.resourceRepository.update(
      { id: resourceId },
      { upvotes, downvotes },
    );
  }

  /**
   * Update resource status (approve/reject) — mod only
   */
  async updateResourceStatus(
    resourceId: number,
    moderatorId: number,
    dto: UpdateResourceStatusDto,
  ): Promise<CourseResource> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['user'],
    });

    if (!resource) {
      throw new NotFoundException(`Resource with id ${resourceId} not found`);
    }

    const previousStatus = resource.status;
    resource.status = dto.status;

    // If approving, award civic points to contributor
    if (
      dto.status === ResourceStatus.APPROVED &&
      previousStatus !== ResourceStatus.APPROVED
    ) {
      await this.awardCivicPoints(
        resource.user.id,
        10, // Points for resource upload approval
        PointType.RESOURCE_UPLOAD,
        resourceId,
        'resource',
      );
    }

    return this.resourceRepository.save(resource);
  }

  /**
   * Delete a resource — mod/admin only
   */
  async deleteResource(resourceId: number): Promise<void> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException(`Resource with id ${resourceId} not found`);
    }

    // Delete associated votes
    await this.resourceVoteRepository.delete({ resource: { id: resourceId } });

    // Delete resource
    await this.resourceRepository.remove(resource);
  }

  /**
   * Award civic points for resource approval
   */
  private async awardCivicPoints(
    userId: number,
    amount: number,
    type: PointType,
    referenceId: number,
    referenceType: string,
  ): Promise<PointTransaction> {
    // Get user and verify exists
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Create point transaction
    const transaction = this.pointTransactionRepository.create({
      user: { id: userId },
      amount,
      type,
      reference_id: referenceId,
      reference_type: referenceType,
    });

    await this.pointTransactionRepository.save(transaction);

    // Update user's cumulative civic points
    user.civic_points += amount;
    await this.updateUserCivicPoints(userId, user.civic_points);

    return transaction;
  }

  /**
   * Helper: Update user civic points
   */
  private async updateUserCivicPoints(
    userId: number,
    points: number,
  ): Promise<void> {
    const dataSource = this.resourceRepository.manager.connection;
    await dataSource.query(
      'UPDATE users SET civic_points = $1 WHERE id = $2',
      [points, userId],
    );
  }

  /**
   * Sanitize resource data (remove sensitive info if needed)
   */
  private sanitizeResource(resource: CourseResource): CourseResource {
    return {
      ...resource,
      user: {
        ...resource.user,
        password_hash: undefined as any,
        google_id: undefined as any,
      },
    };
  }
}
