import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseReview } from '../database/entities/course-review.entity';
import { ReviewVote } from '../database/entities/review-vote.entity';
import { PointTransaction } from '../database/entities/point-transaction.entity';
import { Course } from '../database/entities/course.entity';
import { User } from '../database/entities/user.entity';
import { ReviewStatus, PointType } from '../database/enums';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { VoteReviewDto } from './dto/vote-review.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(CourseReview)
    private readonly reviewRepository: Repository<CourseReview>,
    @InjectRepository(ReviewVote)
    private readonly reviewVoteRepository: Repository<ReviewVote>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get approved reviews for a course, sorted by helpful/recent
   */
  async getReviewsByCourse(
    courseId: number,
    sort: 'helpful' | 'recent' = 'recent',
    page: number = 1,
  ) {
    const take = 10;
    const skip = (page - 1) * take;

    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .where('review.course_id = :courseId', { courseId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .leftJoinAndSelect('review.user', 'user');

    if (sort === 'helpful') {
      qb.orderBy('review.helpfulness_votes', 'DESC').addOrderBy(
        'review.created_at',
        'DESC',
      );
    } else {
      qb.orderBy('review.created_at', 'DESC');
    }

    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();

    // Strip sensitive user data if anonymous
    const reviews = data.map((review) => ({
      ...review,
      user: review.is_anonymous
        ? { id: null, display_name: 'Anonymous' }
        : {
            id: review.user.id,
            display_name: review.user.display_name,
          },
    }));

    return {
      data: reviews,
      total,
      page,
    };
  }

  /**
   * Create a new review for a course
   */
  async createReview(
    courseId: number,
    userId: number,
    dto: CreateReviewDto,
  ): Promise<CourseReview> {
    // Verify course exists
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }

    // Check for existing review (one per user per course)
    const existingReview = await this.reviewRepository.findOne({
      where: { course: { id: courseId }, user: { id: userId } },
    });

    if (existingReview) {
      throw new BadRequestException(
        'You can only submit one review per course',
      );
    }

    const review = this.reviewRepository.create({
      course: { id: courseId },
      user: { id: userId },
      difficulty: dto.difficulty,
      workload_hours: dto.workload_hours,
      quality: dto.quality,
      usefulness: dto.usefulness,
      recommendation: dto.recommendation,
      review_text: dto.review_text || null,
      is_anonymous: dto.is_anonymous ?? false,
      status: ReviewStatus.PENDING,
      helpfulness_votes: 0,
    });

    return this.reviewRepository.save(review);
  }

  /**
   * Vote on review helpfulness (upvote/downvote)
   */
  async voteReview(
    reviewId: number,
    userId: number,
    dto: VoteReviewDto,
  ): Promise<ReviewVote> {
    // Verify review exists
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException(`Review with id ${reviewId} not found`);
    }

    // Check for existing vote
    const existingVote = await this.reviewVoteRepository.findOne({
      where: { review: { id: reviewId }, user: { id: userId } },
    });

    if (existingVote) {
      throw new BadRequestException(
        'You have already voted on this review',
      );
    }

    // Create vote
    const vote = this.reviewVoteRepository.create({
      review: { id: reviewId },
      user: { id: userId },
      is_helpful: dto.is_helpful,
    });

    const savedVote = await this.reviewVoteRepository.save(vote);

    // Update review helpfulness count
    if (dto.is_helpful) {
      review.helpfulness_votes += 1;
    } else {
      review.helpfulness_votes = Math.max(0, review.helpfulness_votes - 1);
    }

    await this.reviewRepository.save(review);

    return savedVote;
  }

  /**
   * Update review status (approve/reject) — mod only
   */
  async updateReviewStatus(
    reviewId: number,
    dto: UpdateReviewStatusDto,
  ): Promise<CourseReview> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['course', 'user'],
    });

    if (!review) {
      throw new NotFoundException(`Review with id ${reviewId} not found`);
    }

    const previousStatus = review.status;
    review.status = dto.status;

    // If approving, recalculate course aggregates and award civic points
    if (
      dto.status === ReviewStatus.APPROVED &&
      previousStatus !== ReviewStatus.APPROVED
    ) {
      await this.recalculateCourseAggregates(review.course.id);

      // Award civic points to reviewer
      await this.awardCivicPoints(
        review.user.id,
        5, // Points awarded for approved review
        PointType.REVIEW_HELPFUL,
        reviewId,
        'review',
      );
    }

    // If rejecting from approved, recalculate aggregates
    if (
      dto.status === ReviewStatus.REJECTED &&
      previousStatus === ReviewStatus.APPROVED
    ) {
      await this.recalculateCourseAggregates(review.course.id);
    }

    return this.reviewRepository.save(review);
  }

  /**
   * Delete a review — mod/admin only
   */
  async deleteReview(reviewId: number): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['course'],
    });

    if (!review) {
      throw new NotFoundException(`Review with id ${reviewId} not found`);
    }

    // Recalculate aggregates if review was approved
    if (review.status === ReviewStatus.APPROVED) {
      await this.recalculateCourseAggregates(review.course.id);
    }

    await this.reviewRepository.remove(review);
  }

  /**
   * Recalculate course aggregate scores from approved reviews
   */
  private async recalculateCourseAggregates(courseId: number): Promise<void> {
    const approvedReviews = await this.reviewRepository.find({
      where: {
        course: { id: courseId },
        status: ReviewStatus.APPROVED,
      },
    });

    if (approvedReviews.length === 0) {
      // Reset aggregates
      await this.courseRepository.update(
        { id: courseId },
        {
          avg_difficulty: 0,
          avg_workload: 0,
          avg_quality: 0,
          avg_usefulness: 0,
          avg_recommendation: 0,
          review_count: 0,
        },
      );
      return;
    }

    const avgDifficulty =
      approvedReviews.reduce((sum, r) => sum + r.difficulty, 0) /
      approvedReviews.length;
    const avgWorkload =
      approvedReviews.reduce((sum, r) => sum + r.workload_hours, 0) /
      approvedReviews.length;
    const avgQuality =
      approvedReviews.reduce((sum, r) => sum + r.quality, 0) /
      approvedReviews.length;
    const avgUsefulness =
      approvedReviews.reduce((sum, r) => sum + r.usefulness, 0) /
      approvedReviews.length;
    const avgRecommendation =
      approvedReviews.reduce((sum, r) => sum + r.recommendation, 0) /
      approvedReviews.length;

    await this.courseRepository.update(
      { id: courseId },
      {
        avg_difficulty: Math.round(avgDifficulty * 100) / 100,
        avg_workload: Math.round(avgWorkload * 10) / 10,
        avg_quality: Math.round(avgQuality * 100) / 100,
        avg_usefulness: Math.round(avgUsefulness * 100) / 100,
        avg_recommendation: Math.round(avgRecommendation * 100) / 100,
        review_count: approvedReviews.length,
      },
    );
  }

  /**
   * Award civic points for review approval
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
    const dataSource = this.reviewRepository.manager.connection;
    await dataSource.query(
      'UPDATE users SET civic_points = $1 WHERE id = $2',
      [points, userId],
    );
  }
}
